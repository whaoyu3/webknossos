import play.sbt.Play.autoImport._
import sbt._


object Dependencies {
  val akkaVersion = "2.4.1"
  val log4jVersion = "2.0-beta9"
  val newrelicVersion = "3.44.1"
  val playVersion = "2.4.6"
  val reactivePlayVersion = "0.11.13-play24"
  val reactiveVersion = "0.11.13"
  val webknossosWrapVersion = "1.1.4"

  val airbrake = "com.scalableminds" %% "play-airbrake" % "0.5.0"
  val akkaAgent = "com.typesafe.akka" %% "akka-agent" % akkaVersion
  val akkaLogging = "com.typesafe.akka" %% "akka-slf4j" % akkaVersion
  val akkaRemote = "com.typesafe.akka" %% "akka-remote" % akkaVersion
  val akkaTest = "com.typesafe.akka" %% "akka-testkit" % akkaVersion
  val ceedubs = "net.ceedubs" %% "ficus" % "1.1.2"
  val commonsCodec = "commons-codec" % "commons-codec" % "1.10"
  val commonsEmail = "org.apache.commons" % "commons-email" % "1.3.1"
  val commonsIo = "commons-io" % "commons-io" % "2.4"
  val commonsLang = "org.apache.commons" % "commons-lang3" % "3.1"
  val grpc = "io.grpc" % "grpc-netty" % scalapb.compiler.Version.grpcJavaVersion
  val grpcServices = "io.grpc" % "grpc-services" % scalapb.compiler.Version.grpcJavaVersion
  val scalapbRuntime = "com.thesamet.scalapb" %% "scalapb-runtime" % scalapb.compiler.Version.scalapbVersion
  val scalapbRuntimeGrpc = "com.thesamet.scalapb" %% "scalapb-runtime-grpc" % scalapb.compiler.Version.scalapbVersion
  val liftCommon = "net.liftweb" % "lift-common_2.10" % "2.6-M3"
  val liftUtil = "net.liftweb" % "lift-util_2.10" % "3.0-M1"
  val log4jApi = "org.apache.logging.log4j" % "log4j-core" % log4jVersion
  val log4jCore =  "org.apache.logging.log4j" % "log4j-api" % log4jVersion
  val newrelic = "com.newrelic.agent.java" % "newrelic-agent" % newrelicVersion
  val newrelicApi = "com.newrelic.agent.java" % "newrelic-api" % newrelicVersion
  val playFramework = "com.typesafe.play" %% "play" % playVersion
  val reactiveBson = "org.reactivemongo" %% "reactivemongo-bson-macros" % reactiveVersion
  val reactivePlay = "org.reactivemongo" %% "play2-reactivemongo" % reactivePlayVersion
  val scalaAsync = "org.scala-lang.modules" %% "scala-async" % "0.9.2"
  val scalaLogging = "com.typesafe.scala-logging" %% "scala-logging" % "3.4.0"
  val scalaTest = "org.scalatest" %% "scalatest" % "3.0.5" % "test"
  val silhouette = "com.mohiva" %% "play-silhouette" % "3.0.5"
  val silhouetteTestkit = "com.mohiva" %% "play-silhouette-testkit" % "3.0.5" % "test"
  val urlHelper = "com.netaporter" %% "scala-uri" % "0.4.14"
  val webknossosWrap = "com.scalableminds" %% "webknossos-wrap" % webknossosWrapVersion
  val xmlWriter = "org.glassfish.jaxb" % "txw2" % "2.2.11"
  val woodstoxXml = "org.codehaus.woodstox" % "wstx-asl" % "3.2.3"

  val sql = Seq(
    "com.typesafe.slick" %% "slick" % "3.2.3",
    "com.typesafe.slick" %% "slick-hikaricp" % "3.2.3",
    "com.typesafe.slick" %% "slick-codegen" % "3.2.3",
    //"com.github.tminglei" %% "slick-pg" % "0.15.5",
    "org.postgresql" % "postgresql" % "42.2.2")

  val utilDependencies = Seq(
    akkaAgent,
    akkaRemote,
    commonsEmail,
    commonsIo,
    commonsLang,
    liftCommon,
    liftUtil,
    log4jApi,
    log4jCore,
    playFramework,
    reactiveBson,
    reactivePlay,
    scalapbRuntime,
    scalaLogging,
    ws
  )

  val webknossosDatastoreDependencies = Seq(
    akkaLogging,
    cache,
    newrelic,
    newrelicApi,
    webknossosWrap,
    grpc,
    grpcServices,
    scalapbRuntimeGrpc,
    component("play-test")
  )

  val webknossosDependencies = Seq(
    airbrake,
    akkaTest,
    ceedubs,
    commonsCodec,
    scalaAsync,
    scalaTest,
    silhouette,
    silhouetteTestkit,
    specs2 % Test,
    urlHelper,
    xmlWriter,
    woodstoxXml) ++ sql

}
