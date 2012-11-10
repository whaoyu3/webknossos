package controllers.admin

import brainflight.security.Secured
import models.security.Role
import controllers.Controller
import models.task.Experiment
import views._
import models.user.User

object TrainingsExperimentAdministration extends Controller with Secured {
  val DefaultRole = Role.Admin

  def startReview(training: String) = Authenticated { implicit request =>
    (for{
      experiment <- Experiment.findOneById(training)
      altered <- Experiment.assignReviewee(experiment, request.user)
    } yield {
      AjaxOk.success(
        html.admin.task.trainingsTasksDetailTableItem(request.user, altered),
        "You got assigned as reviewee.")
    }) getOrElse BadRequest("Trainings-Experiment not found.")
  }
  
  def oxalisReview(training: String) = Authenticated { implicit request =>
    (for{
      experiment <- Experiment.findOneById(training)
      review <- experiment.review
    } yield {
      Redirect(controllers.routes.Game.trace(review.reviewExperiment.toString))
    }) getOrElse BadRequest("Couldn't create review experiment.")
  }

  def abortReview(training: String) = Authenticated { implicit request =>
    Experiment.findOneById(training) map { experiment =>
      val altered = Experiment.unassignReviewee(experiment)
      AjaxOk.success(
        html.admin.task.trainingsTasksDetailTableItem(request.user, altered),
        "You got unassigned from this training.")
    } getOrElse BadRequest("Trainings-Experiment not found.")
  }

  def finishReview(training: String) = Authenticated { implicit request =>
    Experiment.findOneById(training) map { experiment =>
      experiment.review match {
        case Some(r) if r.reviewee == request.user._id =>
          Ok(html.admin.task.trainingsReview(request.user, experiment))
        case _ =>
          BadRequest("No open review found.")
      }
    } getOrElse BadRequest("Trainings-Experiment not found.")
  }

  def finishReviewForm(training: String, passed: Boolean) = Authenticated(parser = parse.urlFormEncoded) { implicit request =>
    (for {
      experiment <- Experiment.findOneById(training)
      if !experiment.state.isFinished
      review <- experiment.review
      if review.reviewee == request.user._id
      comment <- postParameter("comment")
      task <- experiment.task
      training <- task.training
      trainee <- experiment.user
    } yield {
      val alteredExperiment = Experiment.finishReview(experiment, comment)
      if (passed) {
        User.addExperience(trainee, training.domain, training.gain)
        Experiment.finish(alteredExperiment)
      } else
        Experiment.reopen(alteredExperiment)
      Redirect(routes.TrainingsTaskAdministration.list)
    }) getOrElse BadRequest("Trainings-Experiment not found.")
  }
}