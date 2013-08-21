### define
jquery : $
underscore : _
./controller/plane_controller : PlaneController
./controller/arbitrary_controller : ArbitraryController
./controller/abstract_tree_controller : AbstractTreeController
./controller/scene_controller : SceneController
./model : Model
./view : View
../libs/event_mixin : EventMixin
../libs/input : Input
./view/gui : Gui
../libs/toast : Toast
./constants : constants
###

class Controller

  view : null
  planeController : null
  arbitraryController : null
  abstractTreeController : null
  allowedModes : []
  

  constructor : ->

    _.extend(@, new EventMixin())

    @fullScreen = false
    @mode = constants.MODE_PLANE_TRACING

    @model = new Model()

    @model.initialize().done ([restrictions, settings]) =>

      # Do not continue, when there was an error and we got no settings from the server
      unless settings
        return

      unless restrictions.allowAccess
        Toast.Error "You are not allowed to access this tracing"
        return

      for allowedMode in settings.allowedModes
        @allowedModes.push switch allowedMode
          when "oxalis" then constants.MODE_PLANE_TRACING
          when "arbitrary" then constants.MODE_ARBITRARY

      # FIXME: only for developing
      @allowedModes.push(constants.MODE_VOLUME)

      # FPS stats
      stats = new Stats()
      stats.getDomElement().id = "stats"
      $("body").append stats.getDomElement() 

      @view = new View(@model)

      @gui = @createGui(restrictions, settings)

      @sceneController = new SceneController(@model.binary.cube.upperBoundary, @model.flycam, @model)

      @planeController = new PlaneController(@model, stats, @gui, @view.renderer, @view.scene, @sceneController)

      @arbitraryController = new ArbitraryController(@model, stats, @gui, @view.renderer, @view.scene, @sceneController)

      @abstractTreeController = new AbstractTreeController(@model)

      @initMouse()
      @initKeyboard()

      @setMode(constants.MODE_PLANE_TRACING)
      #@setMode(constants.MODE_VOLUME)

      if constants.MODE_PLANE_TRACING not in @allowedModes
        if constants.MODE_ARBITRARY in @allowedModes
          @setMode(constants.MODE_ARBITRARY)
        else
          Toast.error("There was no valid allowed tracing mode specified.")

      @abstractTreeController.view.on 
        nodeClick : (id) => @setActiveNode(id, true, false)

      $("#comment-input").on "change", (event) => 
        @model.cellTracing.setComment(event.target.value)
        $("#comment-input").blur()

      $("#comment-previous").click =>
        @prevComment()

      $("#comment-next").click =>
        @nextComment()

      $("#tab-comments").on "click", "a[data-nodeid]", (event) =>
        event.preventDefault()
        @setActiveNode($(event.target).data("nodeid"), true, false)

      $("#tree-name-submit").click (event) =>
        @model.cellTracing.setTreeName($("#tree-name-input").val())

      $("#tree-name-input").keypress (event) =>
        if event.which == 13
          $("#tree-name-submit").click()
          $("#tree-name-input").blur()

      $("#tree-prev-button").click (event) =>
        @selectNextTree(false)

      $("#tree-next-button").click (event) =>
        @selectNextTree(true)

      $("#tree-create-button").click =>
        @model.cellTracing.createNewTree()

      $("#tree-delete-button").click =>
        @model.cellTracing.deleteTree(true)

      $("#tree-list").on "click", "a[data-treeid]", (event) =>
        event.preventDefault()
        @setActiveTree($(event.currentTarget).data("treeid"), true)

      $("#tree-color-shuffle").click =>
        @model.cellTracing.shuffleActiveTreeColor()

      $("#tree-sort").on "click", "a[data-sort]", (event) =>
        event.preventDefault()
        @model.user.setValue("sortTreesByName", ($(event.currentTarget).data("sort") == "name"))


  initMouse : ->

    # hide contextmenu, while rightclicking a canvas
    $("#render").bind "contextmenu", (event) ->
      event.preventDefault()
      return


  initKeyboard : ->

    $(document).keypress (event) ->
      
      if event.shiftKey && event.which == 63
        $("#help-modal").modal('toggle')


    
    # avoid scrolling while pressing space
    $(document).keydown (event) ->
      event.preventDefault() if (event.which == 32 or event.which == 18 or 37 <= event.which <= 40) and !$(":focus").length
      return



    new Input.KeyboardNoLoop(

      #"5" : =>
      #  start = new Date().getTime()
      #  @sceneController.showAllShapes([50,50,0], [150,150,30])
      #  console.log( "Rendering Time: " + ( new Date().getTime() - start ))
      #  @model.flycam.hasChanged = true

      #View
      "t" : => 
        @view.toggleTheme()       
        @abstractTreeController.drawTree()

      "q" : => @toggleFullScreen()
      
      #Set Mode, outcomment for release
      "shift + 1" : =>
        @setMode(constants.MODE_PLANE_TRACING)
      "shift + 2" : =>
        @setMode(constants.MODE_ARBITRARY)
      "shift + 3" : =>
        @setMode(constants.MODE_VOLUME)

      "m" : => # toggle between plane tracing and arbitrary tracing

        if @mode == constants.MODE_PLANE_TRACING
          @setMode(constants.MODE_ARBITRARY)
        else if @mode == constants.MODE_ARBITRARY
          @setMode(constants.MODE_PLANE_TRACING)

      "super + s, ctrl + s" : (event) =>

        event.preventDefault()
        event.stopPropagation()
        @gui.saveNow()

    )


  setMode : (newMode) ->

    if newMode == constants.MODE_ARBITRARY and newMode in @allowedModes
      @planeController.stop()
      @arbitraryController.start()

    else if (newMode == constants.MODE_PLANE_TRACING or newMode == constants.MODE_VOLUME) and newMode in @allowedModes
      @arbitraryController.stop()
      @planeController.start(newMode)

    else # newMode not allowed or invalid
      return

    @mode = newMode
    @gui.setMode(newMode)
    @view.setMode(newMode)


  toggleFullScreen : ->

    if @fullScreen
      cancelFullscreen = document.webkitCancelFullScreen or document.mozCancelFullScreen or document.cancelFullScreen
      @fullScreen = false
      if cancelFullscreen
        cancelFullscreen.call(document)
    else
      body = $("body")[0]
      requestFullscreen = body.webkitRequestFullScreen or body.mozRequestFullScreen or body.requestFullScreen
      @fullScreen = true
      if requestFullscreen
        requestFullscreen.call(body, body.ALLOW_KEYBOARD_INPUT)


  createGui : (restrictions, settings)->

    { model } = @

    gui = new Gui($("#optionswindow"), model, restrictions, settings)
    gui.update()  

    model.binary.queue.set4Bit(model.user.fourBit)
    model.binary.updateContrastCurve(gui.settings.brightness, gui.settings.contrast)

    gui.on
      deleteActiveNode : =>
        @model.cellTracing.deleteActiveNode()
      setActiveTree : (id) => @setActiveTree(id, false)
      setActiveNode : (id) => @setActiveNode(id, false) # not centered
      setActiveCell : (id) => @model.volumeTracing.setActiveCell(id)
      createNewCell : => @model.volumeTracing.createCell()

    gui


  setActiveTree : (treeId, centered) ->

    @model.cellTracing.setActiveTree(treeId)
    if centered
      @centerActiveNode()


  selectNextTree : (next) ->

    @model.cellTracing.selectNextTree(next)
    @centerActiveNode()


  setActiveNode : (nodeId, centered, mergeTree) ->

    @model.cellTracing.setActiveNode(nodeId, mergeTree)
    if centered
      @centerActiveNode()


  centerActiveNode : ->

    if @mode is constants.MODE_PLANE_TRACING
      @planeController.centerActiveNode()
    else
      @arbitraryController.centerActiveNode()


  prevComment : =>

    @setActiveNode(@model.cellTracing.nextCommentNodeID(false), true)


  nextComment : =>

    @setActiveNode(@model.cellTracing.nextCommentNodeID(true), true)
