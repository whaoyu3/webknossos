package controllers

import play.api.libs.json.Json._
import play.api.libs.json._
import brainflight.security.Secured
import models.security.Role
import models.binary.DataSet
import play.api.Logger
import models.task.Experiment
import models.user._
import models.task.UsedExperiments
import views._
import models.task.Task
import play.api.libs.concurrent._
import play.api.libs.concurrent.execution.defaultContext
import play.api.i18n.Messages

object TaskController extends Controller with Secured {
  def request = Authenticated { implicit request =>
    Async {
      val user = request.user
      if (!Experiment.hasOpenExperiment(request.user, true)) {
        Task.nextTaskForUser(request.user).asPromise.map {
          case Some(task) =>
            val experiment = Task.createExperimentFor(user, task)
            Task.addExperiment(task, experiment)
            
            Ok(experiment.id)
          case _ =>
            BadRequest("There is no task available")
        }
      } else
        Promise.pure(BadRequest("You already have an open experiment."))
    }
  }
  
  def finish(id: String) = Authenticated{ implicit request =>
    Experiment.findOneById(id).filter(_.user == request.user._id).map{ e=>
      val alteredExp = Experiment.complete(e)
      e.taskId.flatMap(Task.findOneById).map{ task =>
        AjaxOk(html.user.dashboard.taskExperimentTableItem(task, alteredExp), Messages("task.finished"))
      } getOrElse BadRequest("Task not found")
    } getOrElse BadRequest("Experiment not found")
  }
}