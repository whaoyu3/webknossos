package models.annotation

import com.scalableminds.util.accesscontext.DBAccessContext
import com.scalableminds.util.time.Instant
import com.scalableminds.util.tools.Fox
import com.scalableminds.webknossos.schema.Tables.{AnnotationPrivatelinks, _}
import oxalis.security.RandomIDGenerator

import javax.inject.Inject
import play.api.libs.json.{JsValue, Json, OFormat}
import slick.jdbc.PostgresProfile.api._
import slick.lifted.Rep
import utils.{ObjectId, SQLClient, SQLDAO}

import scala.concurrent.ExecutionContext

case class AnnotationPrivateLink(_id: ObjectId,
                                 _annotation: ObjectId,
                                 accessToken: String,
                                 expirationDateTime: Option[Instant],
                                 isDeleted: Boolean = false)

object AnnotationPrivateLink {
  implicit val jsonFormat: OFormat[AnnotationPrivateLink] = Json.format[AnnotationPrivateLink]
}

case class AnnotationPrivateLinkParams(annotation: String, expirationDateTime: Option[Instant])

object AnnotationPrivateLinkParams {
  implicit val jsonFormat: OFormat[AnnotationPrivateLinkParams] = Json.format[AnnotationPrivateLinkParams]
}

class AnnotationPrivateLinkService @Inject()()(implicit ec: ExecutionContext) {
  def publicWrites(annotationPrivateLink: AnnotationPrivateLink): Fox[JsValue] =
    Fox.successful(
      Json.obj(
        "id" -> annotationPrivateLink._id.toString,
        "annotation" -> annotationPrivateLink._annotation.toString,
        "accessToken" -> annotationPrivateLink.accessToken,
        "expirationDateTime" -> annotationPrivateLink.expirationDateTime,
      ))

  def generateToken: String = RandomIDGenerator.generateBlocking(12)
}

class AnnotationPrivateLinkDAO @Inject()(sqlClient: SQLClient)(implicit ec: ExecutionContext)
    extends SQLDAO[AnnotationPrivateLink, AnnotationPrivatelinksRow, AnnotationPrivatelinks](sqlClient) {
  protected val collection = AnnotationPrivatelinks

  protected def idColumn(x: AnnotationPrivatelinks): Rep[String] = x._Id

  protected def isDeletedColumn(x: AnnotationPrivatelinks): Rep[Boolean] = x.isdeleted

  protected def parse(r: AnnotationPrivatelinksRow): Fox[AnnotationPrivateLink] =
    Fox.successful(
      AnnotationPrivateLink(
        ObjectId(r._Id),
        ObjectId(r._Annotation),
        r.accesstoken,
        r.expirationdatetime.map(Instant.fromSql),
        r.isdeleted
      )
    )

  override protected def readAccessQ(requestingUserId: ObjectId): String =
    s"""(_annotation in (select _id from webknossos.annotations_ where _user = '${requestingUserId.id}'))"""

  def insertOne(aPL: AnnotationPrivateLink): Fox[Unit] =
    for {
      _ <- run(
        sqlu"""insert into webknossos.annotation_privateLinks(_id, _annotation, accessToken, expirationDateTime, isDeleted)
                         values(${aPL._id.id}, ${aPL._annotation.id}, ${aPL.accessToken}, ${aPL.expirationDateTime}, ${aPL.isDeleted})""")
    } yield ()

  def updateOne(id: ObjectId, annotationId: ObjectId, expirationDateTime: Option[Instant])(
      implicit ctx: DBAccessContext): Fox[Unit] =
    for {
      _ <- assertUpdateAccess(id)
      _ <- run(sqlu"""update webknossos.annotation_privateLinks set _annotation = $annotationId,
                            expirationDateTime = $expirationDateTime where _id = $id""")
    } yield ()

  override def findAll(implicit ctx: DBAccessContext): Fox[List[AnnotationPrivateLink]] =
    for {
      accessQuery <- readAccessQuery
      r <- run(
        sql"""select #$columns from #$existingCollectionName where #$accessQuery""".as[AnnotationPrivatelinksRow])
      parsed <- parseAll(r)
    } yield parsed

  def findAllByAnnotation(annotationId: ObjectId)(implicit ctx: DBAccessContext): Fox[List[AnnotationPrivateLink]] =
    for {
      accessQuery <- readAccessQuery
      r <- run(
        sql"""select #$columns from #$existingCollectionName where _annotation=${annotationId.id} and #$accessQuery"""
          .as[AnnotationPrivatelinksRow])
      parsed <- parseAll(r)
    } yield parsed

  def findOneByAccessToken(accessToken: String): Fox[AnnotationPrivateLink] =
    for {
      r <- run(
        sql"select #$columns from #$existingCollectionName where accessToken = $accessToken"
          .as[AnnotationPrivatelinksRow])
      parsed <- parseFirst(r, accessToken)
    } yield parsed
}
