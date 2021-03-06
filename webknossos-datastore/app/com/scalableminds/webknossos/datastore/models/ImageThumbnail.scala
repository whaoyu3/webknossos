/*
* Copyright (C) 2011-2017 scalable minds UG (haftungsbeschränkt) & Co. KG. <http://scm.io>
*/
package com.scalableminds.webknossos.datastore.models

import com.scalableminds.util.geometry.Point3D
import com.scalableminds.webknossos.datastore.models.datasource.DataLayerLike
import play.api.libs.json.Json

case class ImageThumbnail(mimeType: String, value: String)

object ImageThumbnail {
  implicit val imageThumbnailFormat = Json.format[ImageThumbnail]

  def bestResolutionExponent(dataLayer: DataLayerLike, width: Int, height: Int): Int = {
    // We want to make sure that the thumbnail only contains data, as much as possible but no black border
    // To make sure there is no black border we are going to go with the second best resolution (hence the `- 1`)
    val wr = math.floor(math.log(dataLayer.boundingBox.width.toDouble / width) / math.log(2)).toInt - 1
    val hr = math.floor(math.log(dataLayer.boundingBox.height.toDouble / height) / math.log(2)).toInt - 1

    math.max(0, List(wr, hr, dataLayer.resolutions.size - 1).min)
  }

  def goodThumbnailParameters(dataLayer: DataLayerLike,
                              width: Int,
                              height: Int,
                              centerX: Option[Int] = None,
                              centerY: Option[Int] = None,
                              centerZ: Option[Int] = None,
                              zoom: Option[Int] = None): VoxelPosition = {

    // Parameters that seem to be working good enough
    val center = if (centerX.isDefined && centerY.isDefined && centerZ.isDefined)
                    Point3D(centerX.get, centerY.get, centerZ.get)
                 else dataLayer.boundingBox.center
    val resolutionExponent = zoom.getOrElse(bestResolutionExponent(dataLayer, width, height))
    val resolution = dataLayer.lookUpResolution(resolutionExponent, snapToClosest = true)
    val x = Math.max(0, center.x - width * resolution.x / 2)
    val y = Math.max(0, center.y - height * resolution.y / 2)
    val z = center.z
    new VoxelPosition(x.toInt, y.toInt, z.toInt, resolution)
  }
}
