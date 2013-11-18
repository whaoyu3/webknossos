package oxalis.user

import akka.actor._
import scala.concurrent.duration._
import models.user.{UserService, User}
import akka.agent.Agent
import play.api.libs.concurrent.Akka
import play.api.Play.current
import org.bson.types.ObjectId
import play.api.libs.concurrent.Execution.Implicits._
import reactivemongo.bson.BSONObjectID


case class FlushActivities()

case class UserActivity(user: User, time: Long)

class ActivityMonitor extends Actor {
  implicit val system = ActorSystem("agents")

  val collectedActivities = Agent(Map[BSONObjectID, Long]().empty)

  val updateCycle = 5 minutes

  override def preStart = {
    Akka.system.scheduler.schedule(updateCycle, updateCycle, self, FlushActivities)
  }

  def receive = {
    case UserActivity(user, time) =>
      collectedActivities.send(_.updated(user._id, time))

    case FlushActivities =>

      collectedActivities.send {
        activities =>
          for {
            (userId, time) <- activities
            Some(user) <- UserService.findOneById(userId.toString, useCache = true)
          } {
            UserService.logActivity(user, time)
          }
          Map[BSONObjectID, Long]().empty
      }
  }

}