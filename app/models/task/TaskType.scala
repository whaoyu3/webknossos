package models.task

import com.scalableminds.util.accesscontext.{DBAccessContext, GlobalAccessContext}
import com.scalableminds.util.tools.{Fox, FoxImplicits}
import com.scalableminds.webknossos.datastore.tracings.TracingType
import com.scalableminds.webknossos.schema.Tables._
import models.annotation.AnnotationSettings
import models.team.TeamSQLDAO
import play.api.Play.current
import play.api.i18n.Messages
import play.api.i18n.Messages.Implicits._
import play.api.libs.concurrent.Execution.Implicits._
import play.api.libs.json._
import reactivemongo.bson.BSONObjectID
import reactivemongo.play.json.BSONFormats._
import slick.jdbc.PostgresProfile.api._
import slick.lifted.Rep
import utils.{ObjectId, SQLDAO, SecuredSQLDAO}

case class TaskTypeSQL(
                         _id: ObjectId,
                         _team: ObjectId,
                         summary: String,
                         description: String,
                         settings: AnnotationSettings = AnnotationSettings.defaultFor(TracingType.skeleton),
                         created: Long = System.currentTimeMillis(),
                         isDeleted: Boolean = false
                         ) extends FoxImplicits {

  def publicWrites(implicit ctx: DBAccessContext) = {
    Fox.successful(Json.obj(
      "id" -> _id.toString,
      "summary" -> summary,
      "description" -> description,
      "team" -> _team.toString,
      "settings" -> Json.toJson(settings)
    ))
  }
}

object TaskTypeSQL {
  def fromForm(
                summary: String,
                description: String,
                team: String,
                settings: AnnotationSettings) = {
    TaskTypeSQL(
      ObjectId.generate,
      ObjectId(team),
      summary,
      description,
      settings)
  }
}

object TaskTypeSQLDAO extends SQLDAO[TaskTypeSQL, TasktypesRow, Tasktypes] with SecuredSQLDAO {
  val collection = Tasktypes

  def idColumn(x: Tasktypes): Rep[String] = x._Id
  def isDeletedColumn(x: Tasktypes): Rep[Boolean] = x.isdeleted

  def parse(r: TasktypesRow): Fox[TaskTypeSQL] =
    Some(TaskTypeSQL(
      ObjectId(r._Id),
      ObjectId(r._Team),
      r.summary,
      r.description,
      AnnotationSettings(
        parseArrayTuple(r.settingsAllowedmodes),
        r.settingsPreferredmode,
        r.settingsBranchpointsallowed,
        r.settingsSomaclickingallowed
      ),
      r.created.getTime,
      r.isdeleted
    ))

  override def readAccessQ(requestingUserId: ObjectId) =
    s"""(_team in (select _team from webknossos.user_team_roles where _user = '${requestingUserId.id}')
       or (select _organization from webknossos.teams where webknossos.teams._id = _team)
          in (select _organization from webknossos.users_ where _id = '${requestingUserId.id}' and isAdmin))"""

  override def updateAccessQ(requestingUserId: ObjectId) =
    s"""(_team in (select _team from webknossos.user_team_roles where isTeamManager and _user = '${requestingUserId.id}')
      or (select _organization from webknossos.teams where webknossos.teams._id = _team)
        in (select _organization from webknossos.users_ where _id = '${requestingUserId.id}' and isAdmin))"""

  override def findOne(id: ObjectId)(implicit ctx: DBAccessContext): Fox[TaskTypeSQL] =
    for {
      accessQuery <- readAccessQuery
      rList <- run(sql"select #${columns} from #${existingCollectionName} where _id = ${id.id} and #${accessQuery}".as[TasktypesRow])
      r <- rList.headOption.toFox ?~> ("Could not find object " + id + " in " + collectionName)
      parsed <- parse(r) ?~> ("SQLDAO Error: Could not parse database row for object " + id + " in " + collectionName)
    } yield parsed

  override def findAll(implicit ctx: DBAccessContext): Fox[List[TaskTypeSQL]] =
    for {
      accessQuery <- readAccessQuery
      r <- run(sql"select #${columns} from #${existingCollectionName} where #${accessQuery}".as[TasktypesRow])
      parsed <- Fox.combined(r.toList.map(parse)) ?~> ("SQLDAO Error: Could not parse one of the database rows in " + collectionName)
    } yield parsed


  def insertOne(t: TaskTypeSQL)(implicit ctx: DBAccessContext): Fox[Unit] = {
    val allowedModes = writeArrayTuple(t.settings.allowedModes)
    for {
      _ <- run(sqlu"""insert into webknossos.taskTypes(_id, _team, summary, description, settings_allowedModes, settings_preferredMode,
                                                       settings_branchPointsAllowed, settings_somaClickingAllowed, created, isDeleted)
                         values(${t._id.id}, ${t._team.id}, ${t.summary}, ${t.description}, '#${sanitize(writeArrayTuple(t.settings.allowedModes))}', #${optionLiteral(t.settings.preferredMode.map(sanitize(_)))},
                                ${t.settings.branchPointsAllowed}, ${t.settings.somaClickingAllowed}, ${new java.sql.Timestamp(t.created)}, ${t.isDeleted})""")
    } yield ()
  }


  def updateOne(t: TaskTypeSQL)(implicit ctx: DBAccessContext): Fox[Unit] =
    for { //note that t.created is skipped
      _ <- assertUpdateAccess(t._id)
      _ <- run(sqlu"""update webknossos.taskTypes
                          set
                           _team = ${t._team.id},
                           summary = ${t.summary},
                           description = ${t.description},
                           settings_allowedModes = '#${sanitize(writeArrayTuple(t.settings.allowedModes))}',
                           settings_preferredMode = #${optionLiteral(t.settings.preferredMode.map(sanitize(_)))},
                           settings_branchPointsAllowed = ${t.settings.branchPointsAllowed},
                           settings_somaClickingAllowed = ${t.settings.somaClickingAllowed},
                           isDeleted = ${t.isDeleted}
                          where _id = ${t._id.id}""")
    } yield ()

}
