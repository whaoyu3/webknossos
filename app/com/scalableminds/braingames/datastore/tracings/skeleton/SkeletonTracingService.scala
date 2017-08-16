package com.scalableminds.braingames.datastore.tracings.skeleton

import java.io.{BufferedOutputStream, File, FileOutputStream}
import java.util.UUID

import com.google.inject.Inject
import com.scalableminds.braingames.binary.helpers.DataSourceRepository
import com.scalableminds.braingames.binary.storage.kvstore.VersionedKeyValuePair
import com.scalableminds.braingames.datastore.tracings.TracingDataStore
import com.scalableminds.braingames.datastore.tracings.skeleton.elements.{BranchPoint, Node, SkeletonTracing, Tree}
import com.scalableminds.util.geometry.{BoundingBox, Point3D, Vector3D}
import com.scalableminds.util.image.Color
import com.scalableminds.util.io.{NamedEnumeratorStream, ZipIO}
import com.scalableminds.util.tools.{Fox, FoxImplicits, TextUtils}
import net.liftweb.common.{Box, Empty, Failure, Full}
import play.api.libs.Files.TemporaryFile
import play.api.libs.concurrent.Execution.Implicits._
import play.api.libs.iteratee.Enumerator
import play.api.cache.Cache
import scala.concurrent.duration._
import play.api.Play.current

import scala.concurrent.Future
import scala.io.Source

/**
  * Created by f on 28.06.17.
  */
class SkeletonTracingService @Inject()(
                                        tracingDataStore: TracingDataStore
                                      ) extends FoxImplicits with TextUtils {

  private val temporaryStoreTimeout = 10 minutes

  def createNewId(): String = UUID.randomUUID.toString

  def findRaw(tracingId: String, version: Option[Long] = None): Box[SkeletonTracing] =
    tracingDataStore.skeletons.getJson[SkeletonTracing](tracingId, version).map(_.value)

  private def findVersioned(tracingId: String, version: Option[Long] = None): Box[VersionedKeyValuePair[SkeletonTracing]] =
    tracingDataStore.skeletons.getJson[SkeletonTracing](tracingId, version)

  def findUpdated(tracingId: String, version: Option[Long] = None): Box[SkeletonTracing] = {
    val tracing = findVersioned(tracingId, version).flatMap(tracing => applyPendingUpdates(tracing, version))
    tracing match {
      case Full(t) => tracing
      case _ => getFromTemporaryStore(tracingId)
    }
  }

  def getFromTemporaryStore(tracingId: String): Box[SkeletonTracing] =
    Cache.getAs[SkeletonTracing](tracingId)

  def saveInTemporaryStore(tracing: SkeletonTracing) =
    Cache.set(tracing.id, tracing, temporaryStoreTimeout)

  def save(tracing: SkeletonTracing) = tracingDataStore.skeletons.putJson(tracing.id, tracing.version, tracing)

  def saveUpdates(tracingId: String, updateActionGroups: List[SkeletonUpdateActionGroup]): Fox[List[Unit]] = {
    Fox.combined(for {
      updateActionGroup <- updateActionGroups
    } yield {
      tracingDataStore.skeletonUpdates.putJson(tracingId, updateActionGroup.version, updateActionGroup.actions)
    }.toFox)
  }


  def applyPendingUpdates(tracingVersioned: VersionedKeyValuePair[SkeletonTracing], desiredVersion: Option[Long]): Box[SkeletonTracing] = {
    val tracing = tracingVersioned.value
    val existingVersion = tracingVersioned.version
    val newVersion = findDesiredOrNewestPossibleVersion(desiredVersion, tracingVersioned)
    if (newVersion > existingVersion) {
      val pendingUpdates = findPendingUpdates(tracing.id, existingVersion, newVersion)
      for {
        updatedTracing <- update(tracing, pendingUpdates, newVersion)
      } yield {
        save(updatedTracing)
        updatedTracing
      }
    } else {
      Some(tracing)
    }
  }

  private def findDesiredOrNewestPossibleVersion(desiredVersion: Option[Long], tracingVersioned: VersionedKeyValuePair[SkeletonTracing]): Long = {
    (for {
      newestUpdate <- tracingDataStore.skeletonUpdates.get(tracingVersioned.value.id)
    } yield {
      desiredVersion match {
        case None => newestUpdate.version
        case Some(desiredSome) => math.min(desiredSome, newestUpdate.version)
      }
    }).getOrElse(tracingVersioned.version) //if there are no updates at all, assume tracing was created from NML
  }

  private def findPendingUpdates(tracingId: String, existingVersion: Long, desiredVersion: Long): List[SkeletonUpdateAction] = {
    def toListIter(versionIterator: Iterator[VersionedKeyValuePair[List[SkeletonUpdateAction]]],
                   acc: List[List[SkeletonUpdateAction]]): List[List[SkeletonUpdateAction]] = {
      if (!versionIterator.hasNext) acc
      else {
        val item = versionIterator.next()
        if (item.version <= existingVersion) acc
        else toListIter(versionIterator, item.value :: acc)
      }
    }

    if (desiredVersion == existingVersion) List()
    else {
      val versionIterator = tracingDataStore.skeletonUpdates.scanVersionsJson[List[SkeletonUpdateAction]](tracingId, Some(desiredVersion))
      toListIter(versionIterator, List()).flatten
    }
  }

  private def update(tracing: SkeletonTracing, updates: List[SkeletonUpdateAction], newVersion: Long): Box[SkeletonTracing] = {
    def updateIter(tracingBox: Box[SkeletonTracing], remainingUpdates: List[SkeletonUpdateAction]): Box[SkeletonTracing] = {
      tracingBox match {
        case Empty => Empty
        case Full(tracing) => {
          remainingUpdates match {
            case List() => Full(tracing)
            case RevertToVersionAction(sourceVersion) :: tail => {
              val sourceTracing = findUpdated(tracing.id, Some(sourceVersion))
              updateIter(sourceTracing, tail)
            }
            case update :: tail => updateIter(Full(update.applyOn(tracing)), tail)
          }
        }
        case _ => tracingBox
      }
    }

    updates match {
      case List() => Full(tracing)
      case head :: tail => {
        for {
          updated <- updateIter(Some(tracing), updates)
        } yield updated.copy(version = newVersion)
      }
    }
  }

  def duplicate(tracing: SkeletonTracing): SkeletonTracing = {
    val newTracing = tracing.copy(id = createNewId(), timestamp = System.currentTimeMillis(), version = 0)
    save(newTracing)
    newTracing
  }

  private def mergeTwo(tracingA: SkeletonTracing, tracingB: SkeletonTracing) = {
    def mergeBoundingBoxes(aOpt: Option[BoundingBox], bOpt: Option[BoundingBox]) =
      for {
        a <- aOpt
        b <- bOpt
      } yield a.combineWith(b)

    val nodeMapping = TreeUtils.calculateNodeMapping(tracingA.trees, tracingB.trees)
    val mergedTrees = TreeUtils.mergeTrees(tracingA.trees, tracingB.trees, nodeMapping)
    val mergedBoundingBoxes = mergeBoundingBoxes(tracingA.boundingBox, tracingB.boundingBox)
    tracingA.copy(trees = mergedTrees, boundingBox = mergedBoundingBoxes, version = 0)
  }

  def findMultipleUpdated(tracingSelectors: List[TracingSelector]): Fox[List[SkeletonTracing]] = {
    val boxes = tracingSelectors.map(selector => findUpdated(selector.tracingId, selector.version))
    Fox.combined(boxes.map(_.toFox))
  }

  def merge(tracings: List[SkeletonTracing], newId: String = createNewId()): SkeletonTracing = {
    val merged: SkeletonTracing = tracings.reduceLeft(mergeTwo)
    merged.copy(id=newId)
  }


  //TODO: move to wk
  def downloadNml(tracing: SkeletonTracing, dataSourceRepository: DataSourceRepository): Option[Enumerator[Array[Byte]]] = {
    for {
      dataSource <- dataSourceRepository.findUsableByName(tracing.dataSetName)
    } yield {
      Enumerator.outputStream { os =>
        NmlWriter.toNml(tracing, os, dataSource.scale).map(_ => os.close())
      }
    }
  }

  //TODO: move to wk
  def downloadMultiple(params: DownloadMultipleParameters, dataSourceRepository: DataSourceRepository): Fox[TemporaryFile] = {
    val nmls:List[(Enumerator[Array[Byte]],String)] = for {
      tracingParams <- params.tracings
      tracing <- findUpdated(tracingParams.tracingId, tracingParams.version)
      tracingAsNml <- downloadNml(tracing, dataSourceRepository)
    } yield {
      (tracingAsNml, tracingParams.outfileName)
    }

    for {
      zip <- createZip(nmls, params.zipfileName)
    } yield zip
  }

  //TODO: move to wk
  private def createZip(nmls: List[(Enumerator[Array[Byte]],String)], zipFileName: String): Future[TemporaryFile] = {
    val zipped = TemporaryFile(normalize(zipFileName), ".zip")
    val zipper = ZipIO.startZip(new BufferedOutputStream(new FileOutputStream(zipped.file)))

    def addToZip(nmls: List[(Enumerator[Array[Byte]],String)]): Future[Boolean] = {
      nmls match {
        case head :: tail =>
          zipper.withFile(head._2 + ".nml")(NamedEnumeratorStream(head._1, "").writeTo).flatMap(_ => addToZip(tail))
        case _            =>
          Future.successful(true)
      }
    }

    addToZip(nmls).map { _ =>
      zipper.close()
      zipped
    }
  }

  //TODO: move to wk
  def extractAllFromZip(zipfile: Option[File]): Box[List[SkeletonTracing]] = {
    def isFailure[T](box: Box[T]) = {
      box match {
        case Failure(msg, _, _) => true
        case _ => false
      }
    }
    def findFailure[T](boxList: List[Box[T]]) = boxList.find(box => isFailure(box))

    def unzip(file: File) = {
      val boxOfBoxes: Box[List[Box[SkeletonTracing]]] = ZipIO.withUnziped(file) {
        case (filePath, is) => {
          val isNml = filePath.toString.toLowerCase.endsWith(".nml")
          if (!isNml) Empty
          else {
            val nml = Source.fromInputStream(is).mkString
            NmlParser.parse(createNewId(), filePath.getFileName.toString, nml)
          }
        }
      }
      boxOfBoxes match {
        case Full(tracings: List[Box[SkeletonTracing]]) => {
          val firstFailure = findFailure(tracings)
          firstFailure match {
            case Some(Failure(msg, _, _)) => Failure("Failed to parse an NML in zipfile: " + msg)
            case _ => Full(tracings.flatten)
          }
        }
        case _ => Failure("Could not unpack zipfile")
      }
    }

    zipfile match {
      case None => Failure("Empty or No zipfile")
      case Some(file) => unzip(file)
    }
  }

}
