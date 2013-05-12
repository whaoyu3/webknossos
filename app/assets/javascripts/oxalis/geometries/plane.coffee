### define
../model : Model
../view : View
../model/dimensions : Dimensions
../constants : constants
###

class Plane

  # This class is supposed to collect all the Geometries that belong to one single plane such as
  # the plane itself, its texture, borders and crosshairs.

  CROSSHAIR_COLORS : [[0x0000ff, 0x00ff00], [0xff0000, 0x00ff00], [0x0000ff, 0xff0000]]
  GRAY_CH_COLOR    : 0x222222

  constructor : (planeWidth, textureWidth, flycam, planeID, model) ->
    @flycam          = flycam
    @planeID         = planeID
    @model           = model
    @planeWidth      = planeWidth
    @textureWidth    = textureWidth
    @displayCosshair = true

    # planeWidth means that the plane should be that many voxels wide in the
    # dimension with the highest resolution. In all other dimensions, the plane
    # is smaller in voxels, so that it is squared in nm.
    # --> model.scaleInfo.baseVoxel
    scaleArray = Dimensions.transDim(@model.scaleInfo.baseVoxelFactors, @planeID)
    @scaleVector = new THREE.Vector3(scaleArray...)
    
    @createMeshes(planeWidth, textureWidth)

  createMeshes : (pWidth, tWidth) ->
    # create plane
    planeGeo = new THREE.PlaneGeometry(pWidth, pWidth, 1, 1)

    # create texture
    texture             = new THREE.DataTexture(new Uint8Array(tWidth*tWidth), tWidth, tWidth, THREE.LuminanceFormat, THREE.UnsignedByteType, new THREE.UVMapping(), THREE.ClampToEdgeWrapping , THREE.ClampToEdgeWrapping, THREE.LinearMipmapLinearFilter, THREE.LinearMipmapLinearFilter )
    texture.needsUpdate = true
    textureMaterial     = new THREE.MeshBasicMaterial({wireframe : false})

    # create mesh
    @plane = new THREE.Mesh( planeGeo, textureMaterial )
    @plane.texture = texture

    # create crosshair
    crosshairGeometries = new Array(2)
    @crosshair          = new Array(2)
    for i in [0..1]
      crosshairGeometries[i] = new THREE.Geometry()
      crosshairGeometries[i].vertices.push(new THREE.Vector3(-pWidth/2*i, -pWidth/2*(1-i), 0))
      crosshairGeometries[i].vertices.push(new THREE.Vector3( -25*i,  -25*(1-i), 0))
      crosshairGeometries[i].vertices.push(new THREE.Vector3( 25*i, 25*(1-i), 0))
      crosshairGeometries[i].vertices.push(new THREE.Vector3( pWidth/2*i,  pWidth/2*(1-i), 0))
      @crosshair[i] = new THREE.Line(crosshairGeometries[i], new THREE.LineBasicMaterial({color: @CROSSHAIR_COLORS[@planeID][i], linewidth: 1}), THREE.LinePieces)
      
    # create borders
    prevBordersGeo = new THREE.Geometry()
    prevBordersGeo.vertices.push(new THREE.Vector3( -pWidth/2, -pWidth/2, 0))
    prevBordersGeo.vertices.push(new THREE.Vector3( -pWidth/2,  pWidth/2, 0))
    prevBordersGeo.vertices.push(new THREE.Vector3(  pWidth/2,  pWidth/2, 0))
    prevBordersGeo.vertices.push(new THREE.Vector3(  pWidth/2, -pWidth/2, 0))
    prevBordersGeo.vertices.push(new THREE.Vector3( -pWidth/2, -pWidth/2, 0))
    @prevBorders = new THREE.Line(prevBordersGeo, new THREE.LineBasicMaterial({color: constants.PLANE_COLORS[@planeID], linewidth: 1}))

  setDisplayCrosshair : (value) =>
    @displayCosshair = value

  setOriginalCrosshairColor : =>
    for i in [0..1]
      @crosshair[i].material = new THREE.LineBasicMaterial({color: @CROSSHAIR_COLORS[@planeID][i], linewidth: 1})

  setGrayCrosshairColor : =>
    for i in [0..1]
      @crosshair[i].material = new THREE.LineBasicMaterial({color: @GRAY_CH_COLOR, linewidth: 1})

  updateTexture : =>

      globalPos = @flycam.getPosition()

      area = @flycam.getArea(@planeID)
      tPos = @flycam.getTexturePosition(@planeID).slice()
      if @model?
        @model.binary.planes[@planeID].get(@flycam.getTexturePosition(@planeID), { zoomStep : @flycam.getIntegerZoomStep(), area : @flycam.getArea(@planeID) }).done (buffer) =>
          if buffer
            @plane.texture.image.data.set(buffer)
            @flycam.hasNewTexture[@planeID] = true
  
      if !(@flycam.hasNewTexture[@planeID] or @flycam.hasChanged)
        return

      @plane.texture.needsUpdate = true
      @plane.material.map = @plane.texture
      
      scalingFactor = @flycam.getTextureScalingFactor()
      map = @plane.material.map
      map.repeat.x = (area[2] -  area[0]) / @textureWidth  # (tWidth -4) ???
      map.repeat.y = (area[3] -  area[1]) / @textureWidth
      map.offset.x = area[0] / @textureWidth
      # THREE moved (0, 0) to bottom-left, apparently
      map.offset.y = 1 - area[3] / @textureWidth

  setScale : (factor) =>
    scaleVec = new THREE.Vector3().multiplyVectors(new THREE.Vector3(factor, factor, factor), @scaleVector)
    @plane.scale = @prevBorders.scale = @crosshair[0].scale = @crosshair[1].scale = scaleVec

  setRotation : (rotVec) =>
    @plane.rotation = @prevBorders.rotation = @crosshair[0].rotation = @crosshair[1].rotation = rotVec

  setPosition : (posVec) =>
    @prevBorders.position = @crosshair[0].position = @crosshair[1].position = posVec
    offset = new THREE.Vector3(0, 0, 0)
    if      @planeID == constants.PLANE_XY then offset.z =  1
    else if @planeID == constants.PLANE_YZ then offset.x = -1
    else if @planeID == constants.PLANE_XZ then offset.y = -1
    @plane.position = offset.addVectors(posVec, offset)

  setVisible : (visible) =>
    @plane.visible = @prevBorders.visible = visible
    @crosshair[0].visible = @crosshair[1].visible = visible and @displayCosshair

  getMeshes : =>
    [@plane, @prevBorders, @crosshair[0], @crosshair[1]]

  setLinearInterpolationEnabled : (value) =>
    @plane.texture.magFilter = if value==true then THREE.LinearFilter else THREE.NearestFilter
