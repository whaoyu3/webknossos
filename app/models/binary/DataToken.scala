/*
 * Copyright (C) 20011-2014 Scalable minds UG (haftungsbeschränkt) & Co. KG. <http://scm.io>
 */
package models.binary

import reactivemongo.bson.BSONObjectID
import play.api.libs.json.Json
import java.security.SecureRandom
import java.math.BigInteger
import models.basics.SecuredBaseDAO
import scala.concurrent.duration._
import braingames.reactivemongo.{GlobalAccessContext, DBAccessContext}
import models.user.User
import play.modules.reactivemongo.json.BSONFormats._
import reactivemongo.api.indexes.{IndexType, Index}
import play.api.libs.concurrent.Execution.Implicits._
import oxalis.cleanup.CleanUpService

case class DataToken(
                      _user: BSONObjectID,
                      dataSetName: String,
                      dataLayerName: String,
                      token: String = DataToken.generateRandomToken,
                      expiration: Long = System.currentTimeMillis + DataToken.expirationTime) {
  def isValidFor(dataSetName: String, dataLayerName: String) =
    !isExpired && dataSetName == this.dataSetName && dataLayerName == this.dataLayerName

  def isExpired =
    expiration < System.currentTimeMillis
}

object DataToken {
  private val generator = new SecureRandom()
  implicit val dataTokenFormat = Json.format[DataToken]

  val expirationTime = (24 hours) toMillis

  def generateRandomToken =
    new BigInteger(130, generator).toString(32);
}

object DataTokenService {

  CleanUpService.register("deletion of expired dataTokens", DataToken.expirationTime millis){
    DataTokenDAO.removeExpiredTokens()(GlobalAccessContext).map(r => s"deleted ${r.updated}")
  }

  def generate(user: User, dataSetName: String, dataLayerName: String)(implicit ctx: DBAccessContext) = {
    val token = DataToken(user._id, dataSetName, dataLayerName)
    DataTokenDAO.insert(token).map(_ => token)
  }
}

object DataTokenDAO extends SecuredBaseDAO[DataToken] {
  val collectionName = "dataTokens"

  val formatter = DataToken.dataTokenFormat

  underlying.indexesManager.ensure(Index(Seq("token" -> IndexType.Ascending)))

  def findByToken(token: String)(implicit ctx: DBAccessContext) = {
    findOne("token", token)
  }

  def removeExpiredTokens()(implicit ctx: DBAccessContext) = {
    remove(Json.obj("expiration" -> Json.obj("$lte" -> System.currentTimeMillis)))
  }
}
