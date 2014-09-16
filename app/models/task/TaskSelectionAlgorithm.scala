package models.task

import models.basics.SecuredBaseDAO
import java.util.Date
import play.api.libs.json.Writes
import play.api.libs.json.Json
import com.scalableminds.util.reactivemongo.DBAccessContext
import reactivemongo.bson.BSONObjectID
import play.modules.reactivemongo.json.BSONFormats._
import play.api.libs.concurrent.Execution.Implicits._

case class TaskSelectionAlgorithm(js: String, active: Boolean = true, timestamp: Date = new Date, _id: BSONObjectID = BSONObjectID.generate) {
  val id = _id.stringify

  def isValidAlgorithm = TaskSelectionAlgorithm.isValidAlgorithm(js)
}

object TaskSelectionAlgorithm {
  implicit val taskSelectionAlgorithmFormat = Json.format[TaskSelectionAlgorithm]

  // TODO: implement testing strategie
  def isValidAlgorithm(js: String) = true
}

object TaskSelectionAlgorithmDAO extends SecuredBaseDAO[TaskSelectionAlgorithm] {

  val collectionName = "taskAlgorithms"
  val formatter = TaskSelectionAlgorithm.taskSelectionAlgorithmFormat

  def current(implicit ctx: DBAccessContext) = withExceptionCatcher{
    find(Json.obj("active" -> true))
    .sort(Json.obj("timestamp" -> -1))
    .one[TaskSelectionAlgorithm].map {
      case Some(a) => a
      case _ => throw new Exception("No active task selection algorithm found!")
    }
  }

  def use(alg: TaskSelectionAlgorithm)(implicit ctx: DBAccessContext) {
    update(
      Json.obj("_id" -> Json.obj("$ne" -> alg._id)),
      Json.obj("$set" -> Json.obj("active" -> false)),
      multi = true)
    update(
      Json.obj("_id" -> alg._id),
      Json.obj("$set" -> Json.obj("active" -> true)))
  }

  implicit object TaskSelectionAlgorithmFormat extends Writes[TaskSelectionAlgorithm] {
    def writes(e: TaskSelectionAlgorithm) = Json.obj(
      "id" -> e.id,
      "js" -> e.js,
      "active" -> e.active)
  }
}