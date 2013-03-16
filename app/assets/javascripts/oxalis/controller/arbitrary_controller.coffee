### define
jquery : $
underscore : _
libs/event_mixin : EventMixin
libs/request : Request
libs/input : Input
../geometries/arbitrary_plane : ArbitraryPlane
../geometries/crosshair : Crosshair
../view/arbitrary_view : ArbitraryView
../geometries/arbitrary_plane_info : ArbitraryPlaneInfo
###

TYPE_USUAL = 0

class ArbitraryController

  WIDTH : 128
  HEIGHT : 128

  plane : null
  crosshair : null
  cam : null

  fullscreen : false
  lastNodeMatrix : null

  model : null
  view : null

  record : false

  input :
    mouse : null
    keyboard : null
    keyboardNoLoop : null

    unbind : ->
      @mouse?.unbind()
      @keyboard?.unbind()
      @keyboardNoLoop?.unbind()


  constructor : (@model, stats, renderer, scene) ->

    _.extend(this, new EventMixin())

    @canvas = canvas = $("#render-canvas")
    
    @cam = @model.flycam3d
    @view = new ArbitraryView(canvas, @cam, stats, renderer, scene)    

    @plane = new ArbitraryPlane(@cam, @model, @WIDTH, @HEIGHT)
    @view.addGeometry @plane

    @infoPlane = new ArbitraryPlaneInfo()

    @input = _.extend({}, @input)

    @crosshair = new Crosshair(@cam, model.user.crosshairSize)
    @view.addGeometry(@crosshair)

    @bind()
    @view.draw()

    @stop()


  render : (forceUpdate, event) ->

    matrix = @cam.getMatrix()
    @model.binary.arbitraryPing(matrix)

    @model.route.rendered()


  initMouse : ->
    @input.mouse = new Input.Mouse(
      @canvas
      leftDownMove : (delta) =>
        mouseInversionX = if @model.user.inverseX then 1 else -1
        mouseInversionY = if @model.user.inverseY then 1 else -1
        @cam.yawDistance(
          -delta.x * mouseInversionX * @model.user.mouseRotateValue
        );
        @cam.pitchDistance(
          delta.y * mouseInversionY * @model.user.mouseRotateValue
        )
      scroll : @scroll
    )


  initKeyboard : ->
    
    @input.keyboard = new Input.Keyboard(
 
      #Scale plane
      "l" : => @view.applyScale -@model.user.scaleValue
      "k" : => @view.applyScale  @model.user.scaleValue

      #Move   
      "w" : => @cam.move [0, @model.user.moveValue3d, 0]
      "s" : => @cam.move [0, -@model.user.moveValue3d, 0]
      "a" : => @cam.move [-@model.user.moveValue3d, 0, 0]
      "d" : => @cam.move [@model.user.moveValue3d, 0, 0]
      "space" : =>  
        @cam.move [0, 0, @model.user.moveValue3d]
        @moved()
      "shift + space" : => @cam.move [0, 0, -@model.user.moveValue3d]
      
      #Rotate in distance
      "left"  : => @cam.yawDistance -@model.user.rotateValue
      "right" : => @cam.yawDistance @model.user.rotateValue
      "up"    : => @cam.pitchDistance -@model.user.rotateValue
      "down"  : => @cam.pitchDistance @model.user.rotateValue
      
      #Rotate at centre
      "shift + left"  : => @cam.yaw @model.user.rotateValue
      "shift + right" : => @cam.yaw -@model.user.rotateValue
      "shift + up"    : => @cam.pitch @model.user.rotateValue
      "shift + down"  : => @cam.pitch -@model.user.rotateValue

      #Zoom in/out
      "i" : => @cam.zoomIn()
      "o" : => @cam.zoomOut()      
    )
    
    @input.keyboardNoLoop = new Input.KeyboardNoLoop(
      
      #Branches
      "b" : => @pushBranch()
      "j" : => @popBranch() 
      
      #Reset Matrix
      "r" : => @cam.resetRotation()

      #Recenter active node
      "y" : => @centerActiveNode()

      #Recording of Waypoints
      "z" : => 
        @record = true
        @infoPlane.updateInfo(true)
        @setWaypoint()
      "u" : => 
        @record = false
        @infoPlane.updateInfo(false)
    )

  init : ->

    @setRouteClippingDistance @model.user.routeClippingDistance


  bind : ->

    @view.on "render", (force, event) => @render(force, event)

    @model.binary.cube.on "bucketLoaded", => @view.draw()

    @model.user.on "crosshairSizeChanged", (value) =>
      @crosshair.setScale(value)

    @model.user.on "routeClippingDistanceChanged", (value) =>
      @setRouteClippingDistance(value)


  start : ->

    @initKeyboard()
    @initMouse()
    @init()
    @view.start()
    @view.draw()     
 

  stop : ->

    @view.stop()
    @input.unbind()


  scroll : (delta, type) =>

    switch type
      when "shift" then @setParticleSize(delta)


  addNode : (position) =>

    if @model.user.newNodeNewTree == true
      @createNewTree()
      @model.route.one("rendered", =>
        @model.route.one("rendered", =>
          @model.route.addNode(position, TYPE_USUAL)))
    else
      @model.route.addNode(position, TYPE_USUAL)


  setWaypoint : () =>

    unless @record 
      return

    position  = @cam.getPosition()
    activeNodePos = @model.route.getActiveNodePos()

    @addNode(position)    


  setParticleSize : (delta) =>

    @model.route.setParticleSize(@model.route.getParticleSize() + delta)


  setRouteClippingDistance : (value) =>

    @view.setRouteClippingDistance(value)

  pushBranch : ->

    @model.route.pushBranch()


  popBranch : ->

    _.defer => @model.route.popBranch().done((id) => 
      @setActiveNode(id, true)
    )

  centerActiveNode : ->

    position = @model.route.getActiveNodePos()
    if position
      @cam.setPosition position


  setActiveNode : (nodeId, centered, mergeTree) ->

    @model.route.setActiveNode(nodeId, mergeTree)
    @cam.setPosition @model.route.getActiveNodePos()  


  moved : ->

    matrix = @cam.getMatrix()

    unless @lastNodeMatrix?
      @lastNodeMatrix = matrix

    lastNodeMatrix = @lastNodeMatrix

    vector = [
      lastNodeMatrix[12] - matrix[12]
      lastNodeMatrix[13] - matrix[13]
      lastNodeMatrix[14] - matrix[14]
    ]
    vectorLength = V3.length(vector)

    if vectorLength > 10
      @setWaypoint()
      @lastNodeMatrix = matrix    