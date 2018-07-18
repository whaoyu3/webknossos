package models.user

import com.mohiva.play.silhouette.api.util.PasswordInfo
import com.mohiva.play.silhouette.api.{Identity, LoginInfo}
import com.scalableminds.util.accesscontext._
import com.scalableminds.util.tools.{Fox, FoxImplicits, JsonHelper}
import com.scalableminds.webknossos.schema.Tables._
import reactivemongo.play.json.BSONFormats._
import models.binary.DataSetSQLDAO
import models.configuration.{DataSetConfiguration, UserConfiguration}
import models.team._
import play.api.Play.current
import play.api.i18n.Messages
import play.api.i18n.Messages.Implicits._
import play.api.libs.concurrent.Execution.Implicits._
import play.api.libs.functional.syntax._
import play.api.libs.json._
import reactivemongo.bson.BSONObjectID
import slick.jdbc.PostgresProfile.api._
import slick.jdbc.TransactionIsolation.Serializable
import slick.lifted.Rep
import utils.{ObjectId, SQLDAO, SimpleSQLDAO}


case class UserSQL(
                  _id: ObjectId,
                  _organization: ObjectId,
                  email: String,
                  firstName: String,
                  lastName: String,
                  lastActivity: Long = System.currentTimeMillis(),
                  userConfiguration: JsValue,
                  md5hash: String,
                  loginInfo: LoginInfo,
                  passwordInfo: PasswordInfo,
                  isAdmin: Boolean,
                  isSuperUser: Boolean,
                  isDeactivated: Boolean,
                  created: Long = System.currentTimeMillis(),
                  isDeleted: Boolean = false
                  ) extends DBAccessContextPayload with Identity with FoxImplicits {
  val name = firstName + " " + lastName

  val abreviatedName =
    (firstName.take(1) + lastName).toLowerCase.replace(" ", "_")

  def organization = OrganizationSQLDAO.findOne(_organization)(GlobalAccessContext)

  def experiences = UserExperiencesSQLDAO.findAllExperiencesForUser(_id)(GlobalAccessContext)

  def teamMemberships = UserTeamRolesSQLDAO.findTeamMembershipsForUser(_id)(GlobalAccessContext)

  def teamManagerMemberships =
    for {
      teamMemberships <- teamMemberships
    } yield teamMemberships.filter(_.isTeamManager)

  def teamManagerTeamIds =
    for {
      teamManagerMemberships <- teamManagerMemberships
    } yield teamManagerMemberships.map(_.teamId)

  def teamIds =
    for {
      teamMemberships <- teamMemberships
    } yield teamMemberships.map(_.teamId)

  def isTeamManagerOrAdminOf(otherUser: UserSQL): Fox[Boolean] =
    for {
      otherUserTeamIds <- otherUser.teamIds
      teamManagerTeamIds <- teamManagerTeamIds
    } yield (otherUserTeamIds.intersect(teamManagerTeamIds).nonEmpty || this.isAdminOf(otherUser))

  def isTeamManagerOrAdminOf(_team: ObjectId): Fox[Boolean] =
    for {
      team <- TeamSQLDAO.findOne(_team)(GlobalAccessContext)
      teamManagerTeamIds <- teamManagerTeamIds
    } yield (teamManagerTeamIds.contains(_team) || this.isAdmin && this._organization == team._organization)

  def assertTeamManagerOrAdminOf(_team: ObjectId) =
    for {
      asBoolean <- isTeamManagerOrAdminOf(_team)
      _ <- asBoolean ?~> Messages("notAllowed")
    } yield ()

  def isEditableBy(otherUser: UserSQL): Fox[Boolean] =
    for {
      otherIsTeamManagerOrAdmin <- otherUser.isTeamManagerOrAdminOf(this)
      teamMemberships <- teamMemberships
    } yield {
      (otherIsTeamManagerOrAdmin || teamMemberships.isEmpty)
    }

  def assertEditableBy(otherUser: UserSQL): Fox[Unit] =
    for {
      asBoolean <- isEditableBy(otherUser)
      _ <- asBoolean ?~> Messages("notAllowed")
    } yield ()

  def isAdminOf(otherUser: UserSQL): Boolean =
    this._organization == otherUser._organization && this.isAdmin

  def isTeamManagerInOrg(_organization: ObjectId): Fox[Boolean] =
    for {
      teamManagerMemberships <- teamManagerMemberships
    } yield (teamManagerMemberships.length > 0 && _organization == this._organization)

  def isAdminOf(_organization: ObjectId): Boolean =
    isAdmin && _organization == this._organization

  def publicWrites(requestingUser: UserSQL)(implicit ctx: DBAccessContext): Fox[JsObject] =
    for {
      isEditable <- isEditableBy(requestingUser)
      organization <- organization
      teamMemberships <- teamMemberships
      teamMembershipsJs <- Fox.serialCombined(teamMemberships)(_.publicWrites)
      experiences <- experiences
    } yield {
      Json.obj(
        "id" -> _id.toString,
        "email" -> email,
        "firstName" -> firstName,
        "lastName" -> lastName,
        "isAdmin" -> isAdmin,
        "isActive" -> !isDeactivated,
        "teams" -> teamMembershipsJs,
        "experiences" -> experiences,
        "lastActivity" -> lastActivity,
        "isAnonymous" -> false,
        "isEditable" -> isEditable,
        "organization" -> organization.name
      )
    }

  def compactWrites(implicit ctx: DBAccessContext): Fox[JsObject] =
    for {
      teamMemberships <- teamMemberships
      teamMembershipsJs <- Fox.serialCombined(teamMemberships)(_.publicWrites)
    } yield {
      Json.obj(
        "id" -> _id.toString,
        "email" -> email,
        "firstName" -> firstName,
        "lastName" -> lastName,
        "isAnonymous" -> false,
        "teams" -> teamMembershipsJs
      )
    }

}

object UserSQL {
  def fromUser(user: User)(implicit ctx: DBAccessContext): Fox[UserSQL] =
    for {
      organization <- OrganizationSQLDAO.findOneByName(user.organization)
    } yield {
      UserSQL(
        ObjectId.fromBsonId(user._id),
        organization._id,
        user.email,
        user.firstName,
        user.lastName,
        user.lastActivity,
        Json.toJson(user.userConfiguration.configuration),
        user.md5hash,
        user.loginInfo,
        user.passwordInfo,
        user.isAdmin,
        user.isSuperUser,
        !user.isActive,
        System.currentTimeMillis())
  }
}

object UserSQLDAO extends SQLDAO[UserSQL, UsersRow, Users] {
  val collection = Users

  def idColumn(x: Users): Rep[String] = x._Id
  def isDeletedColumn(x: Users): Rep[Boolean] = x.isdeleted

  def parse(r: UsersRow): Fox[UserSQL] =
    Fox.successful(UserSQL(
      ObjectId(r._Id),
      ObjectId(r._Organization),
      r.email,
      r.firstname,
      r.lastname,
      r.lastactivity.getTime,
      Json.parse(r.userconfiguration),
      r.md5hash,
      LoginInfo(r.logininfoProviderid, r.logininfoProviderkey),
      PasswordInfo(r.passwordinfoHasher, r.passwordinfoPassword),
      r.isadmin,
      r.issuperuser,
      r.isdeactivated,
      r.created.getTime,
      r.isdeleted
    ))

  override def readAccessQ(requestingUserId: ObjectId) =
    s"""(_id in (select _user from webknossos.user_team_roles where _team in (select _team from webknossos.user_team_roles where _user = '${requestingUserId}')))
        or (_organization in (select _organization from webknossos.users_ where _id = '${requestingUserId}' and isAdmin))"""
  override def deleteAccessQ(requestingUserId: ObjectId) =
    s"_organization in (select _organization from webknossos.users_ where _id = '${requestingUserId}' and isAdmin)"


  override def findOne(id: ObjectId)(implicit ctx: DBAccessContext): Fox[UserSQL] =
    for {
      accessQuery <- readAccessQuery
      rList <- run(sql"select #${columns} from #${existingCollectionName} where _id = ${id} and #${accessQuery}".as[UsersRow])
      r <- rList.headOption.toFox ?~> ("Could not find object " + id + " in " + collectionName)
      parsed <- parse(r) ?~> ("SQLDAO Error: Could not parse database row for object " + id + " in " + collectionName)
    } yield parsed

  override def findAll(implicit ctx: DBAccessContext): Fox[List[UserSQL]] = {
    for {
      accessQuery <- readAccessQuery
      r <- run(sql"select #${columns} from #${existingCollectionName} where #${accessQuery}".as[UsersRow])
      parsed <- Fox.combined(r.toList.map(parse))
    } yield parsed
  }

  def findOneByEmail(email: String)(implicit ctx: DBAccessContext): Fox[UserSQL] =
    for {
      accessQuery <- readAccessQuery
      rList <- run(sql"select #${columns} from #${existingCollectionName} where email = ${email} and #${accessQuery}".as[UsersRow])
      r <- rList.headOption.toFox
      parsed <- parse(r)
    } yield {
      parsed
    }

  def findAllByTeams(teams: List[ObjectId], includeDeactivated: Boolean = true)(implicit ctx: DBAccessContext) = {
    if (teams.isEmpty) Fox.successful(List())
    else
      for {
        accessQuery <- readAccessQuery
        r <- run(sql"""select u.*
                         from (select #${columns} from #${existingCollectionName} where #${accessQuery}) u join webknossos.user_team_roles on u._id = webknossos.user_team_roles._user
                         where webknossos.user_team_roles._team in #${writeStructTupleWithQuotes(teams.map(_.id))}
                               and (u.isDeactivated = false or u.isDeactivated = ${includeDeactivated})
                         order by _id""".as[UsersRow])
        parsed <- Fox.combined(r.toList.map(parse))
      } yield parsed
  }

  def findAllByIds(ids: List[ObjectId])(implicit ctx: DBAccessContext): Fox[List[UserSQL]] =
    for {
      accessQuery <- readAccessQuery
      r <- run(sql"select #${columns} from #${existingCollectionName} where _id in #${writeStructTupleWithQuotes(ids.map(_.id))} and #${accessQuery}".as[UsersRow])
      parsed <- Fox.combined(r.toList.map(parse))
    } yield parsed


  def insertOne(u: UserSQL)(implicit ctx: DBAccessContext): Fox[Unit] =
    for {
      _ <- run(
        sqlu"""insert into webknossos.users(_id, _organization, email, firstName, lastName, lastActivity, userConfiguration, md5hash, loginInfo_providerID,
                                            loginInfo_providerKey, passwordInfo_hasher, passwordInfo_password, isDeactivated, isAdmin, isSuperUser, created, isDeleted)
                                            values(${u._id}, ${u._organization}, ${u.email}, ${u.firstName}, ${u.lastName}, ${new java.sql.Timestamp(u.lastActivity)},
                                                   '#${sanitize(Json.toJson(u.userConfiguration).toString)}', ${u.md5hash}, '#${sanitize(u.loginInfo.providerID)}', ${u.loginInfo.providerKey},
                                                   '#${sanitize(u.passwordInfo.hasher)}', ${u.passwordInfo.password}, ${u.isDeactivated}, ${u.isAdmin}, ${u.isSuperUser},
                                                   ${new java.sql.Timestamp(u.created)}, ${u.isDeleted})
          """)
    } yield ()

  def updateLastActivity(userId: ObjectId, lastActivity: Long)(implicit ctx: DBAccessContext): Fox[Unit] =
    updateTimestampCol(userId, _.lastactivity, new java.sql.Timestamp(lastActivity))

  def updatePasswordInfo(userId: ObjectId, passwordInfo: PasswordInfo)(implicit ctx: DBAccessContext): Fox[Unit] = {
    for {
      _ <- assertUpdateAccess(userId)
      _ <- run(sqlu"""update webknossos.users set
                          passwordInfo_hasher = '#${sanitize(passwordInfo.hasher)}',
                          passwordInfo_password = ${passwordInfo.password}
                      where _id = ${userId}""")
    } yield ()
  }

  def updateUserConfiguration(userId: ObjectId, userConfiguration: UserConfiguration)(implicit ctx: DBAccessContext): Fox[Unit] =
    for {
      _ <- assertUpdateAccess(userId)
      _ <- run(
        sqlu"""update webknossos.users
               set userConfiguration = '#${sanitize(Json.toJson(userConfiguration.configuration).toString)}'
               where _id = ${userId}""")
    } yield ()

  def updateValues(userId: ObjectId, firstName: String, lastName: String, email: String, isAdmin: Boolean, isDeactivated: Boolean)(implicit ctx: DBAccessContext) = {
    val q = for {row <- Users if (notdel(row) && idColumn(row) === userId.id)} yield (row.firstname, row.lastname, row.email, row.logininfoProviderkey, row.isadmin, row.isdeactivated)
    for {
      _ <- assertUpdateAccess(userId)
      _ <- run(q.update(firstName, lastName, email, email, isAdmin, isDeactivated))
    } yield ()
  }
}

object UserTeamRolesSQLDAO extends SimpleSQLDAO {

  def findTeamMembershipsForUser(userId: ObjectId)(implicit ctx: DBAccessContext): Fox[List[TeamMembershipSQL]] = {
    val query = for {
      (teamRoleRow, team) <- UserTeamRoles.filter(_._User === userId.id) join Teams  on (_._Team === _._Id)
    } yield (team._Id, team.name, teamRoleRow.isteammanager)

    for {
      rows: Seq[(String, String, Boolean)] <- run(query.result)
      teamMemberships <- Fox.combined(rows.toList.map { case (teamId, teamName, isTeamManager) => ObjectId.parse(teamId).map(teamIdValidated => TeamMembershipSQL(teamIdValidated, isTeamManager)) })
    } yield {
      teamMemberships
    }
  }

  private def insertQuery(userId: ObjectId, teamMembership: TeamMembershipSQL) =
    sqlu"insert into webknossos.user_team_roles(_user, _team, isTeamManager) values(${userId}, ${teamMembership.teamId}, ${teamMembership.isTeamManager})"

  def updateTeamMembershipsForUser(userId: ObjectId, teamMemberships: List[TeamMembershipSQL])(implicit ctx: DBAccessContext): Fox[Unit] = {
    val clearQuery = sqlu"delete from webknossos.user_team_roles where _user = ${userId}"
    val insertQueries = teamMemberships.map(insertQuery(userId, _))
    for {
      _ <- UserSQLDAO.assertUpdateAccess(userId)
      _ <- run(DBIO.sequence(List(clearQuery) ++ insertQueries).transactionally)
    } yield ()
  }

  def insertTeamMembership(userId: ObjectId, teamMembership: TeamMembershipSQL)(implicit ctx: DBAccessContext): Fox[Unit] =
    for {
      _ <- UserSQLDAO.assertUpdateAccess(userId)
      _ <- run(insertQuery(userId, teamMembership))
    } yield ()


  def removeTeamFromAllUsers(teamId: ObjectId)(implicit ctx: DBAccessContext): Fox[Unit] =
    for {
      r <- run(sqlu"delete from webknossos.user_team_roles where _team = ${teamId}")
    } yield ()

}

object UserExperiencesSQLDAO extends SimpleSQLDAO {

  def findAllExperiencesForUser(userId: ObjectId)(implicit ctx: DBAccessContext): Fox[Map[String, Int]] = {
    for {
      rows <- run(UserExperiences.filter(_._User === userId.id).result)
    } yield {
      rows.map(r => (r.domain, r.value)).toMap
    }
  }

  def updateExperiencesForUser(userId: ObjectId, experiences: Map[String, Int])(implicit ctx: DBAccessContext): Fox[Unit] = {
    val clearQuery = sqlu"delete from webknossos.user_experiences where _user = ${userId}"
    val insertQueries = experiences.map { case (domain, value) => sqlu"insert into webknossos.user_experiences(_user, domain, value) values(${userId}, ${domain}, ${value})"}
    for {
      _ <- UserSQLDAO.assertUpdateAccess(userId)
      _ <- run(DBIO.sequence(List(clearQuery) ++ insertQueries).transactionally)
    } yield ()
  }

}

object UserDataSetConfigurationSQLDAO extends SimpleSQLDAO {

  def findAllForUser(userId: ObjectId)(implicit ctx: DBAccessContext): Fox[Map[ObjectId, JsValue]] = {
    for {
      rows <- run(UserDatasetconfigurations.filter(_._User === userId.id).result)
    } yield {
      rows.map(r => (ObjectId(r._Dataset), Json.parse(r.configuration).as[JsValue])).toMap
    }
  }

  def updateDatasetConfigurationForUserAndDataset(userId: ObjectId, dataSetId: ObjectId, configuration: Map[String, JsValue])(implicit ctx: DBAccessContext): Fox[Unit] = {
    for {
      _ <- UserSQLDAO.assertUpdateAccess(userId)
      deleteQuery = sqlu"""delete from webknossos.user_dataSetConfigurations
               where _user = ${userId} and _dataSet = ${dataSetId}"""
      insertQuery  = sqlu"""insert into webknossos.user_dataSetConfigurations(_user, _dataSet, configuration)
               values(${userId}, ${dataSetId}, '#${sanitize(Json.toJson(configuration).toString)}')"""
      _ <- run(DBIO.sequence(List(deleteQuery, insertQuery)).transactionally
              .withTransactionIsolation(Serializable), retryCount = 50, retryIfErrorContains = List(transactionSerializationError))
    } yield ()
  }

  def insertDatasetConfigurationsFor(userId: ObjectId, configurations: Map[String, DataSetConfiguration])(implicit ctx: DBAccessContext): Fox[Unit] = {
    for {
      _ <- Fox.combined(configurations.map{case (dataSetName, configuration) => insertDatasetConfiguration(userId, dataSetName, configuration.configuration)}.toList)
    } yield ()
  }

  private def insertDatasetConfiguration(userId: ObjectId, dataSetName: String, configuration: Map[String, JsValue])(implicit ctx: DBAccessContext): Fox[Unit] = {
    for {
      dataSet <- DataSetSQLDAO.findOneByName(dataSetName)
      _ <- insertDatasetConfiguration(userId, dataSet._id, configuration)
    } yield ()
  }

  private def insertDatasetConfiguration(userId: ObjectId, dataSetId: ObjectId, configuration: Map[String, JsValue])(implicit ctx: DBAccessContext): Fox[Unit] = {
    for {
      _ <- UserSQLDAO.assertUpdateAccess(userId)
      _ <- run(
        sqlu"""insert into webknossos.user_dataSetConfigurations(_user, _dataSet, configuration)
               values ('#${sanitize(configuration.toString)}', ${userId} and _dataSet = ${dataSetId})""")
    } yield ()
  }

}


case class User(
                 email: String,
                 firstName: String,
                 lastName: String,
                 isActive: Boolean = false,
                 md5hash: String = "",
                 organization: String,
                 teams: List[TeamMembership],
                 userConfiguration: UserConfiguration = UserConfiguration.default,
                 dataSetConfigurations: Map[String, DataSetConfiguration] = Map.empty,
                 experiences: Map[String, Int] = Map.empty,
                 lastActivity: Long = System.currentTimeMillis,
                 isAdmin: Boolean = false,
                 _isAnonymous: Option[Boolean] = None,
                 _isSuperUser: Option[Boolean] = None,
                 _id: BSONObjectID = BSONObjectID.generate,
                 loginInfo: LoginInfo,
                 passwordInfo: PasswordInfo) extends DBAccessContextPayload with Identity with FoxImplicits {

  def teamIds = teams.map(_._id)

  def isSuperUser = _isSuperUser getOrElse false

  def isAnonymous = _isAnonymous getOrElse false

  val name = firstName + " " + lastName

  val abreviatedName =
    (firstName.take(1) + lastName).toLowerCase.replace(" ", "_")

  lazy val id = _id.stringify

  lazy val teamManagerTeams = teams.filter(_.isTeamManager)

  lazy val teamManagerTeamIds = teamManagerTeams.map(_._id)

  def isTeamManagerOrAdminOf(_team: BSONObjectID): Fox[Boolean] = {
    for {
      team <- TeamDAO.findOneById(_team)(GlobalAccessContext)
    } yield (teamManagerTeamIds.contains(_team) || isAdmin && organization == team.organization)
  }

  def assertTeamManagerOrAdminOf(_team: BSONObjectID) =
    for {
      asBoolean <- isTeamManagerOrAdminOf(_team)
      _ <- asBoolean ?~> Messages("notAllowed")
    } yield ()

  def isTeamManagerInOrg(organization: String) = teamManagerTeams.length > 0 && organization == this.organization

  def isAdminOf(organization: String): Boolean = isAdmin && organization == this.organization

  override def toString = email


  def isEditableBy(other: User) =
    other.isTeamManagerOrAdminOf(this) || teams.isEmpty

  def isTeamManagerOrAdminOf(user: User): Boolean =
    user.teamIds.intersect(teamManagerTeamIds).nonEmpty || this.isAdminOf(user)

  def isAdminOf(user: User): Boolean =
    this.organization == user.organization && this.isAdmin
}

object User extends FoxImplicits {

  implicit val passwordInfoJsonFormat: Format[PasswordInfo] = Json.format[PasswordInfo]
  implicit val userFormat = Json.format[User]

  def userPublicWrites(requestingUser: User): Writes[User] =
    ((__ \ "id").write[String] and
      (__ \ "email").write[String] and
      (__ \ "firstName").write[String] and
      (__ \ "lastName").write[String] and
      (__ \ "isAdmin").write[Boolean] and
      (__ \ "isActive").write[Boolean] and
      (__ \ "teams").write[List[JsObject]] and
      (__ \ "experiences").write[Map[String, Int]] and
      (__ \ "lastActivity").write[Long] and
      (__ \ "isAnonymous").write[Boolean] and
      (__ \ "isEditable").write[Boolean] and
      (__ \ "organization").write[String]) (u =>
      (u.id, u.email, u.firstName, u.lastName, u.isAdmin, u.isActive, u.teams.map(TeamMembership.teamMembershipPublicWrites(_)), u.experiences,
        u.lastActivity, u.isAnonymous, u.isEditableBy(requestingUser), u.organization))

  def userCompactWrites: Writes[User] =
    ((__ \ "id").write[String] and
      (__ \ "email").write[String] and
      (__ \ "firstName").write[String] and
      (__ \ "lastName").write[String] and
      (__ \ "isAnonymous").write[Boolean] and
      (__ \ "teams").write[List[JsObject]]) (u =>
      (u.id, u.email, u.firstName, u.lastName, u.isAnonymous, u.teams.map(TeamMembership.teamMembershipPublicWrites(_))))

  private def constructDatasetConfigurations(userId: ObjectId)(implicit ctx: DBAccessContext): Fox[Map[String, DataSetConfiguration]] =
    for {
      jsValueByDatasetName <- fetchDatasetConfigurations(userId)
    } yield {
      jsValueByDatasetName.mapValues(v => DataSetConfiguration(v.validate[Map[String, JsValue]].getOrElse(Map.empty)))
    }

  private def fetchDatasetConfigurations(userId: ObjectId)(implicit ctx: DBAccessContext): Fox[Map[String, JsValue]] = {
    for {
      jsValueByDataSetId: Map[ObjectId, JsValue] <- UserDataSetConfigurationSQLDAO.findAllForUser(userId)
      keyList: List[ObjectId] = jsValueByDataSetId.keySet.toList
      dataSets <- Fox.combined(keyList.map(dataSetId => DataSetSQLDAO.findOne(dataSetId)))
    } yield {
      keyList.zip(dataSets).map(Function.tupled((dataSetId, dataSet) => (dataSet.name, jsValueByDataSetId(dataSetId)))).toMap
    }
  }

  def fromUserSQL(s: UserSQL)(implicit ctx: DBAccessContext): Fox[User] = {
    for {
      idBson <- s._id.toBSONObjectId.toFox ?~> Messages("sql.invalidBSONObjectId", s._id.toString)
      teamRolesSQL <- UserTeamRolesSQLDAO.findTeamMembershipsForUser(s._id)(GlobalAccessContext)
      teamRoles <- Fox.combined(teamRolesSQL.map(TeamMembership.fromTeamMembershipSQL(_)))
      experiences <- UserExperiencesSQLDAO.findAllExperiencesForUser(s._id)(GlobalAccessContext)
      userConfiguration <- JsonHelper.jsResultToFox(s.userConfiguration.validate[Map[String, JsValue]])
      dataSetConfigurations <- constructDatasetConfigurations(s._id)(GlobalAccessContext)
      organization <- OrganizationSQLDAO.findOne(s._organization)
    } yield {
      User(
        s.email,
        s.firstName,
        s.lastName,
        !s.isDeactivated,
        s.md5hash,
        organization.name,
        teamRoles,
        UserConfiguration(userConfiguration),
        dataSetConfigurations,
        experiences,
        s.lastActivity,
        s.isAdmin,
        None,
        Some(s.isSuperUser),
        idBson,
        s.loginInfo,
        s.passwordInfo
      )
    }
  }

}
