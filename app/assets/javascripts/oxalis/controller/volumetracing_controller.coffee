### define
../model/dimensions : Dimensions
../constants : constants
###

class VolumeTracingController

  constructor : ( { @model, @view, @sceneController, @cameraController, @move, @calculateGlobalPos } ) ->

    @mouseControls =
      
      leftDownMove : (delta, pos, ctrlPressed) =>
        
        if ctrlPressed
          @move [
            delta.x * @model.user.getMouseInversionX() / @view.scaleFactor
            delta.y * @model.user.getMouseInversionY() / @view.scaleFactor
            0
          ]
        else
          @drawVolume( @calculateGlobalPos(pos))
      
      leftClick : (pos, shiftPressed, altPressed, plane) =>
        @model.volumeTracing.startEditing()
      
      leftMouseUp : =>
        @model.volumeTracing.finishLayer()
          

    @keyboardControls =

      "c" : =>
        @model.volumeTracing.createCell()

  drawVolume : (pos) ->
    @model.volumeTracing.addToLayer(pos)