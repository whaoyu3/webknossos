package com.scalableminds.webknossos.datastore.rpc

import java.io.File

import akka.stream.scaladsl.Source
import akka.util.ByteString
import com.scalableminds.util.tools.{Fox, FoxImplicits}
import scalapb.{GeneratedMessage, GeneratedMessageCompanion, Message}
import com.typesafe.scalalogging.LazyLogging
import net.liftweb.common.{Failure, Full}
import play.api.http.HeaderNames
import play.api.http.Status._
import play.api.libs.iteratee.Enumerator
import play.api.libs.json._
import play.api.libs.ws._

import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.duration.Duration

class RPCRequest(val id: Int, val url: String, wsClient: WSClient) extends FoxImplicits with LazyLogging {

  var request: WSRequest = wsClient.url(url)

  def withQueryString(parameters: (String, String)*): RPCRequest = {
    request = request.withQueryString(parameters :_*)
    this
  }

  def withQueryStringOptional(key: String, valueOptional: Option[String]): RPCRequest = {
    valueOptional match {
      case Some(value: String) => { request = request.withQueryString((key, value))}
      case _ =>
    }
    this
  }

  def get: Fox[WSResponse] = {
    request = request
      .withMethod("GET")
    performRequest
  }

  def getWithJsonResponse[T : Reads]: Fox[T] = {
    request = request
      .withMethod("GET")
    parseJsonResponse(performRequest)
  }

  def getWithProtoResponse[T <: GeneratedMessage with Message[T]](companion: GeneratedMessageCompanion[T]): Fox[T] = {
    request = request
      .withMethod("GET")
    parseProtoResponse(performRequest)(companion)
  }

  def post(file: File): Fox[WSResponse] = {
    request = request
      .withBody(FileBody(file))
      .withMethod("POST")
    performRequest
  }

  def postWithJsonResponse[T : Reads](file: File): Fox[T] = {
    request = request
      .withBody(FileBody(file))
      .withMethod("POST")
    parseJsonResponse(performRequest)
  }

  def postWithProtoResponse[T <: GeneratedMessage with Message[T]](file: File)(companion: GeneratedMessageCompanion[T]): Fox[T] = {
    request = request
      .withBody(FileBody(file))
      .withMethod("POST")
    parseProtoResponse(performRequest)(companion)
  }

  def post[T : Writes](body: T = Json.obj()): Fox[WSResponse] = {
    request = request
      .withHeaders(HeaderNames.CONTENT_TYPE -> "application/json")
      .withBody(Json.toJson(body))
      .withMethod("POST")
    performRequest
  }

  def postWithJsonResponse[T : Writes, U : Reads](body: T = Json.obj()): Fox[U] = {
    request = request
      .withHeaders(HeaderNames.CONTENT_TYPE -> "application/json")
      .withBody(Json.toJson(body))
      .withMethod("POST")
    parseJsonResponse(performRequest)
  }

  def postJsonWithProtoResponse[J: Writes, T <: GeneratedMessage with Message[T]](body: J = Json.obj())(companion: GeneratedMessageCompanion[T]): Fox[T] = {
    request = request
      .withHeaders(HeaderNames.CONTENT_TYPE -> "application/json")
      .withBody(Json.toJson(body))
      .withMethod("POST")
    parseProtoResponse(performRequest)(companion)
  }

  def postProtoWithJsonResponse[T <: GeneratedMessage with Message[T], J: Reads](body: T): Fox[J] = {
    request = request
      .withHeaders(HeaderNames.CONTENT_TYPE -> "application/x-protobuf")
      .withBody(body.toByteArray)
      .withMethod("POST")
    parseJsonResponse(performRequest)
  }

  def getStream: Fox[Source[ByteString, _]] = {
    logger.debug(s"Sending WS request to $url (ID: $id). " +
      s"RequestBody: '${requestBodyPreview}'")
    request.withMethod("GET").withRequestTimeout(Duration.Inf).stream().map(response => Full(response.body)).recover {
      case e =>
        val errorMsg = s"Error sending WS request to $url (ID: $id): " +
          s"${e.getMessage}\n${e.getStackTrace.mkString("\n    ")}"
        logger.error(errorMsg)
        Failure(errorMsg)
    }
  }

  private def performRequest: Fox[WSResponse] = {
    logger.debug(s"Sending WS request to $url (ID: $id). " +
      s"RequestBody: '${requestBodyPreview}'")
    request.execute().map { result =>
      if (result.status == OK) {
        Full(result)
      } else {
        val errorMsg = s"Unsuccessful WS request to $url (ID: $id)." +
          s"Status: ${result.status}. Response: ${result.bodyAsBytes.map(_.toChar).mkString.take(100)}"
        logger.error(errorMsg)
        Failure(errorMsg)
      }
    }.recover {
      case e =>
        val errorMsg = s"Error sending WS request to $url (ID: $id): " +
          s"${e.getMessage}\n${e.getStackTrace.mkString("\n    ")}"
        logger.error(errorMsg)
        Failure(errorMsg)
    }
  }

  private def parseJsonResponse[T : Reads](r: Fox[WSResponse]): Fox[T] = {
    r.flatMap { response =>
      if (response.status == OK) {
        logger.debug(s"Successful request (ID: $id). " +
          s"Body: '${response.body.take(100)}'")
      } else {
        logger.error(s"Failed to send WS request to $url (ID: $id). " +
          s"RequestBody: '${requestBodyPreview}'. Status ${response.status}. " +
          s"ResponseBody: '${response.body.take(100)}'")
      }
      Json.parse(response.body).validate[T] match {
        case JsSuccess(value, _) =>
          Full(value)
        case JsError(e) =>
          val errorMsg = s"Request returned invalid JSON (ID: $id): $e"
          logger.error(errorMsg)
          Failure(errorMsg)
      }
    }
  }

  private def parseProtoResponse[T <: GeneratedMessage with Message[T]](r: Fox[WSResponse])(companion: GeneratedMessageCompanion[T]) = {
    r.flatMap { response =>
      if (response.status == OK) {
        logger.debug(s"Successful request (ID: $id). " +
          s"Body: <${response.body.length} bytes of protobuf data>")
      } else {
        logger.error(s"Failed to send WS request to $url (ID: $id). " +
          s"RequestBody: '${requestBodyPreview}'. Status ${response.status}. " +
          s"ResponseBody: '${response.body.take(100)}'")
      }
      try {
        Full(companion.parseFrom(response.bodyAsBytes.toArray))
      } catch {
        case e: Exception => {
          val errorMsg = s"Request returned invalid Protocol Buffer Data (ID: $id): $e"
          logger.error(errorMsg)
          Failure(errorMsg)
        }
      }
    }
  }

  private def requestBodyPreview: String = {
    request.body match {
      case body: InMemoryBody if request.headers.get(HeaderNames.CONTENT_TYPE).getOrElse(List()).contains("application/x-protobuf") =>
        s"<${body.bytes.length} bytes of protobuf data>"
      case body: InMemoryBody =>
        body.bytes.take(100).utf8String + (if(body.bytes.size > 100) s"... <omitted ${body.bytes.size - 100} bytes>" else "")
      case body: FileBody =>
        s"<file: ${body.file.length} bytes>"
      case _ =>
        ""
    }
  }
}