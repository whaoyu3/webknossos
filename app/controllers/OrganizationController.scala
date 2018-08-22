package controllers

import javax.inject.Inject
import com.scalableminds.util.accesscontext.GlobalAccessContext
import com.scalableminds.util.tools.{Fox, FoxImplicits}
import models.team._
import play.api.Play
import play.api.i18n.MessagesApi
import play.api.libs.concurrent.Execution.Implicits._
import play.api.libs.json.Json
import play.api.mvc.Action
import play.api.Play.current
import utils.WkConf

class OrganizationController @Inject()(val messagesApi: MessagesApi) extends Controller with FoxImplicits {

  def listAllOrganizations = Action.async { implicit request =>
    for {
      allOrgs <- OrganizationDAO.findAll(GlobalAccessContext)
      js <- Fox.serialCombined(allOrgs)(o => o.publicWrites(GlobalAccessContext))
    } yield {
      Ok(Json.toJson(js))
    }
  }

  def getOperatorData = Action { implicit request =>
      Ok(Json.toJson(WkConf.operatorData))
  }
}
