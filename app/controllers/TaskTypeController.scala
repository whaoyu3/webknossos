package controllers

import javax.inject.Inject
import com.scalableminds.util.tools.{Fox, FoxImplicits}
import models.annotation.AnnotationSettings
import models.task._
import oxalis.security.WebknossosSilhouette.SecuredAction
import play.api.i18n.{Messages, MessagesApi}
import play.api.libs.concurrent.Execution.Implicits._
import play.api.libs.functional.syntax._
import play.api.libs.json.Reads._
import play.api.libs.json._
import utils.ObjectId

class TaskTypeController @Inject()(val messagesApi: MessagesApi) extends Controller with FoxImplicits{

  val taskTypePublicReads =
    ((__ \ 'summary).read[String](minLength[String](2) or maxLength[String](50)) and
      (__ \ 'description).read[String] and
      (__ \ 'team).read[String] (ObjectId.stringObjectIdReads("team")) and
      (__ \ 'settings).read[AnnotationSettings]) (TaskTypeSQL.fromForm _)

  def create = SecuredAction.async(parse.json) { implicit request =>
    withJsonBodyUsing(taskTypePublicReads) { taskType =>
      for {
        _ <- ensureTeamAdministration(request.identity, taskType._team)
        _ <- TaskTypeSQLDAO.insertOne(taskType)
        js <- taskType.publicWrites
      } yield Ok(js)
    }
  }

  def get(taskTypeId: String) = SecuredAction.async { implicit request =>
    for {
      taskTypeIdValidated <- ObjectId.parse(taskTypeId)
      taskType <- TaskTypeSQLDAO.findOne(taskTypeIdValidated) ?~> Messages("taskType.notFound")
      _ <- ensureTeamAdministration(request.identity, taskType._team)
      js <- taskType.publicWrites
    } yield Ok(js)
  }

  def list = SecuredAction.async { implicit request =>
    for {
      taskTypes <- TaskTypeSQLDAO.findAll
      js <- Fox.serialCombined(taskTypes)(t => t.publicWrites)
    } yield Ok(Json.toJson(js))
  }

  def update(taskTypeId: String) = SecuredAction.async(parse.json) { implicit request =>
    withJsonBodyUsing(taskTypePublicReads) { taskTypeFromForm =>
      for {
        taskTypeIdValidated <- ObjectId.parse(taskTypeId)
        taskType <- TaskTypeSQLDAO.findOne(taskTypeIdValidated) ?~> Messages("taskType.notFound")
        updatedTaskType = taskTypeFromForm.copy(_id = taskType._id)
        _ <- ensureTeamAdministration(request.identity, taskType._team)
        _ <- ensureTeamAdministration(request.identity, updatedTaskType._team)
        _ <- TaskTypeSQLDAO.updateOne(updatedTaskType)
        js <- updatedTaskType.publicWrites
      } yield {
        JsonOk(js, Messages("taskType.editSuccess"))
      }
    }
  }

  def delete(taskTypeId: String) = SecuredAction.async { implicit request =>
    for {
      taskTypeIdValidated <- ObjectId.parse(taskTypeId)
      taskType <- TaskTypeSQLDAO.findOne(taskTypeIdValidated) ?~> Messages("taskType.notFound")
      _ <- ensureTeamAdministration(request.identity, taskType._team)
      _ <- TaskTypeSQLDAO.deleteOne(taskTypeIdValidated) ?~> Messages("taskType.deleteFailure")
      _ <- TaskSQLDAO.removeAllWithTaskTypeAndItsAnnotations(taskTypeIdValidated) ?~> Messages("taskType.deleteFailure")
    } yield {
      JsonOk(Messages("taskType.deleteSuccess", taskType.summary))
    }
  }
}
