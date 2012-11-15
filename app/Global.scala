import akka.actor.Props
import play.api._
import play.api.Play.current
import play.api.libs.concurrent._
import play.api.Play.current
import models.security._
import models.task._
import models.user._
import models.Color
import models.graph._
import models.task._
import models.binary._
import models.experiment._
import models.basics.BasicEvolution
import brainflight.mail.DefaultMails
import brainflight.tools.geometry._
import brainflight.mail.Mailer
import brainflight.io.StartWatching
import brainflight.io.DataSetChangeHandler
import brainflight.io.DirectoryWatcherActor
import scala.collection.parallel.Tasks
import akka.util.duration._

object Global extends GlobalSettings {

  override def onStart(app: Application) {
    val DirectoryWatcher = Akka.system.actorOf(
      Props(new DirectoryWatcherActor(new DataSetChangeHandler)),
      name = "directoryWatcher")
    DirectoryWatcher ! StartWatching("binaryData")

    if (Play.current.mode == Mode.Dev) {
      BasicEvolution.runDBEvolution()
      // Data insertion needs to be delayed, because the dataSets need to be
      // found by the DirectoryWatcher first
      Akka.system.scheduler.scheduleOnce(1 second)(InitialData.insert())
    }
  }
}

/**
 * Initial set of data to be imported
 * in the sample application.
 */
object InitialData {

  def insert() = {
    if (Role.findAll.isEmpty) {
      Role.insert(Role("user", Nil, Color(0.2274F, 0.5294F, 0.6784F, 1)))
      Role.insert(Role("admin", Permission("*", "*" :: Nil) :: Nil, Color(0.2F, 0.2F, 0.2F, 1)))
      Role.insert(Role("reviewer", Permission("review", "*" :: Nil) :: Nil, Color(0.2745F, 0.5333F, 0.2784F, 1)))
    }

    if (User.findOneByEmail("scmboy@scalableminds.com").isEmpty) {
      User.insert(User(
        "scmboy@scalableminds.com",
        "SCM",
        "Boy",
        true,
        brainflight.security.SCrypt.hashPassword("secret"),
        "local",
        UserConfiguration.defaultConfiguration,
        Set("user", "admin")))
    }

    if (TaskSelectionAlgorithm.findAll.isEmpty) {
      TaskSelectionAlgorithm.insert(TaskSelectionAlgorithm(
        """function simple(user, tasks){ 
          |  return tasks[0];
          |}""".stripMargin))
    }

    if (TaskType.findAll.isEmpty) {
      val tt = TaskType(
        "ek_0563_BipolarCells",
        "Check those cells out!",
        TimeSpan(5, 10, 15))
      TaskType.insert(tt)
      if (Task.findAll.isEmpty) {
        val sample = Experiment.createExperimentFor(User.default)
        
        Task.insert(Task(
          DataSet.default.name,
          0,
          tt._id,
          Point3D(0, 0, 0),
          Experience("basic", 5)))
          
        Task.insert(Task(
          DataSet.default.name,
          0,
          tt._id,
          Point3D(50, 50, 50),
          Experience.empty,
          100,
          Integer.MAX_VALUE,
          training = Some(Training(
              "basic",
              5,
              5,
              sample._id))))
      }
    }
  }
}
