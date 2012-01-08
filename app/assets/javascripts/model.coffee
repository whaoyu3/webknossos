# This is the model. It takes care of the data including the 
# communication with the server.
#
# All public operations are **asynchronous**. Give us a **callback**
# and we'll (ahem) call you back. The first parameter of the callback 
# is always reserved for any occured error. So make sure to check
# whether every thing went right.

Model ?= {}

# #Model.Binary#
# Binary is the real deal.
# It loads and stores the primary graphical data.
#
# **Mixins**: Model.Synchronizable
# 
# ##Data structure##
#
# ###Concept###
# We store 3-dimensional data with each coordinate >= [0,0,0].
# Each point is stored in **buckets** which resemble a cubical grid. 
# Those buckets are kept in an expandable data structure (**cube**) which 
# represents the smallest cuboid covering all used buckets.
# 
# ###Implementation###
# Each point value (greyscale color) is represented by a number 
# between 1 and 2, where 1 is black and 2 white. Actually WebGL
# generally uses [0, 1], but as TypedArrays are initialized with
# 0 we shift the actual interval to use 0 as an undefined value.
# 
# The buckets are implemented as `Float32Array`s with a length of
# `BUCKET_WIDTH ^ 3`. Each point can be easiliy found through simple 
# arithmetik (see `Model.Binary.pointIndex`).
#
# The cube is defined by the offset `[x,y,z]` and size `[a,b,c]` 
# of the cuboid. It is actually just a standard javascript array 
# with each item being either `null` or a bucket. The length of the
# array is `a * b * c`. Also finding th containing bucket of a point 
# can be done with pretty simple math (see `Model.Binary.bucketIndex`).
#
# ###Inserting###
# When inserting new data into the data structure we first need
# to make sure the cube is big enough to cover all points. Otherwise
# we'll have to expand the cube (see `Model.Binary.expandCube`). 
# Then we add each point. If the corresponding bucket of a point 
# isn't initialized we'll handle that on the fly 
# (see `Model.Binary.value`).
# 
#
# ##Loading##
# The server provides the coordinates (vertices) and color values of
# the data separately. Therefore we can (lazily) load a template of 
# vertices which represent a generic chunk of data.
# Once we really get a request, we then just need to load the color
# data and transform the vertices template to match the position of 
# the data block (see `Model.Binary._ping`). This is pretty efficient 
# as we do not need another roundtrip to the server.
# We then just need to add all the loaded data into our data structure.
#
# ##Querying##
# `Model.Binary.get` provides an interface to query the stored data.
# Give us an array of coordinates (vertices) and we'll give you the 
# corresponding color values. Keep in mind that valid color values
# are in the range from 1 to 2. 0 would be an unknown point.
#
# There is no need for you to send us rounded vertex values because
# we try to interpolate under the hood. We apply either a linear,
# bilinear or trilinear interpolation so the result should be quite
# smooth. However, if one of the required 2, 4 or 8 points is missing
# we'll decide that your requested point is missing aswell.
# 
# 
# This is a cuboid. With buckets. If you haven't noticed yet.
# 
#         +--+--+--+--+--+--+--+
#        /  /  /  /  /  /  /  /|
#       /--/--/--/--/--/--/--/ |
#      /  /  /  /  /  /  /  /|/|
#     +--+--+--+--+--+--+--+ | |
#     |  |  |  |  |  |  |  |/|/|
#     |--|--|--|--|--|--|--| | |
#     |  |  |  |  |  |  |  |/|/
#     |--|--|--|--|--|--|--| /
#     |  |  |  |  |  |  |  |/
#     +--+--+--+--+--+--+--+
#
#

#
Model.Binary =
	
	verticesTemplate : null
	
	# We use lazy initialization load the vertex template.
	# This method can only be called once if initialization succeeds.
	initializeVerticesTemplate : (callback) ->
		@initializeVerticesTemplate = _.once2(@_initializeVerticesTemplate)
		@initializeVerticesTemplate(callback)

	_initializeVerticesTemplate : (doneCallback) ->
		
		request
			url : '/binary/model/cube'
			responseType : 'arraybuffer'
			,	
			(err, data) =>
				
				callback = doneCallback(err)
				
				unless err
					@verticesTemplate = new Int8Array(data)
					callback(null)
				
				return

	# This method gives you the vertices for a chunk of data (mostly a cube). 
	# You need to provide the position and direction of the cube you're looking 
	# for.
	#
	# Imagine you want to load a cube which sits arbitrarily in 3d space i.e. 
	# it has an arbitrary position and arbitrary orientation (direction). 
	# Because we have a template cube full of vertices at a standard position 
	# `[0,0,0]` with a standard orientation `[0,1,0]` it is just a matter of
	# applying a transformation matrix. Specifically, we rotate and translate
	# the template. Big ups to [Vladimir Vukićević](http://vlad1.com/) for
	# writing the mjs-js (matrix javascripat) library.
	#
	# Parameters:
	#
	# *   `position` is a 3-element array representing the center point of the 
	# front of the cube. 
	# *   `direction` is also 3-element array representing the vector of the axis
	# spiking through the center of front and back
	# 
	# Callback Parameters:
	#
	# *   `vertices` is a `Float32Array` with the transformed values. Every three
	# elements represent the coordinates of a vertex.
	#
	# Example: `Model.Binary.vertices([23, 42, 12], [1,2,3], (err, vertices) -> ...)`
	#
	pullVertices : (position, direction, callback) ->
		
		# Some lazy initialization magic.
		@initializeVerticesTemplate (err) =>
			return callback err if err

			template  = @verticesTemplate
			output    = new Float32Array(template.length)
			direction = V3.normalize direction

			# `[0,1,0]` is the axis of the template, so there is no need for rotating
			# We can do translation on our own, because it's not too complex..and 
			# probably faster.
			if direction[0] == 0 and direction[1] == 1 and direction[2] == 0

				[px, py, pz] = position
				
				# Defer the computation the current stack isn't blocked
				_.defer -> 
					for i in [0...template.length] by 3
						output[i]     = px + template[i]
						output[i + 1] = py + template[i + 1]
						output[i + 2] = pz + template[i + 2]
					callback(null, output) if callback
				
			else
				
				mat = M4x4.makeRotate V3.angle([0,1,0], direction), [direction[2], 0, -direction[0]]
				mat = M4x4.translateSelf position, mat
			
				_.defer -> 
					callback null, M4x4.transformPointsAffine(mat, template, output)


	# This method allows you to query the data structure. Give us an array of
	# vertices and we'll give you the corresponding color values. We'll even
	# do some interpolation so the result is smoother.
	# 
	# Parameters:
	# 
	# *   `vertices` is a `Float32Array with the vertices you'd like to query. There
	# is no need for you to round the coordinates. Otherwise you'd have a nearest-
	# neighbor-interpolation, which isn't pretty and kind of wavey. Every three
	# elements (x,y,z) represent one vertex.
	#
	# Callback Parameters:
	# 
	# *   `colors` is a `Float32Array` containing the color values of the requested
	# points.
	#
	get : (vertices, callback) ->

		_value = _.bind(@value, @)
		colors = new Float32Array(vertices.length / 3 >> 0)

		for i in [0...vertices.length] by 3

			x = vertices[i]
			y = vertices[i + 1]
			z = vertices[i + 2]

			colors[i / 3] = interpolate(x, y, z, _value)
		
		callback(null, colors) if callback

	
	# Use this method to let us know when you've changed your spot. Then we'll try to 
	# preload some data. 
	#
	# Parameters:
	#
	# *   `position` is a 3-element array representing the point you're currently at
	# *   `direction` is a 3-element array representing the vector of the direction 
	# you look at
	#
	# No Callback Paramters

	ping : (position, direction, callback) ->
		
		loadedData = []
		
		finalCallback = (err, vertices, colors) =>
			if err
				callback err
			else
				# First let's find out what extent the points have we just loaded.
				max_x = min_x = vertices[0]
				max_y = min_y = vertices[1]
				max_z = min_z = vertices[2]
				for i in [3...vertices.length] by 3
					x = vertices[i]
					y = vertices[i + 1]
					z = vertices[i + 2]
					max_x = if x > max_x then x else max_x
					max_y = if y > max_y then y else max_y
					max_z = if z > max_z then z else max_z
					min_x = if x < min_x then x else min_x
					min_y = if y < min_y then y else min_y
					min_z = if z < min_z then z else min_z
				
				min_x = if x < 0 then 0 else x
				min_y = if y < 0 then 0 else y
				min_z = if z < 0 then 0 else z
				max_x = if x < 0 then 0 else x
				max_y = if y < 0 then 0 else y
				max_z = if z < 0 then 0 else z


				# Maybe we need to expand our data structure.
				@extendPoints(min_x, min_y, min_z, max_x, max_y, max_z)
				
				# Then we'll just put the point in to our data structure.
				for i in [0...colors.length]
					x = vertices[i * 3]
					y = vertices[i * 3 + 1]
					z = vertices[i * 3 + 2]
					if x >= 0 and y >= 0 and z >= 0
						@value(x, y, z, colors[i] / 256 + 1)

				callback null if callback

		# We use synchronized callbacks to make sure both callbacks have returned.
		@vertices position, direction, @synchronizingCallback(loadedData, finalCallback)

		@pull position, direction, @synchronizingCallback(loadedData, finalCallback)

	pull : (position, direction, callback) ->
		request
			url : "/binary/data/cube?px=#{position[0]}&py=#{position[1]}&pz=#{position[2]}&ax=#{direction[0]}&ay=#{direction[1]}&az=#{direction[2]}"
			responseType : 'arraybuffer'
			,
			(err, data) ->
				if err
					callback(err) if callback
				else
					callback(null, new Uint8Array(data)) if callback
	
	# Now comes the implementation of our internal data structure.
	# `cube` is the main array. It actually represents a cuboid 
	# containing all the buckets. `cubeSize` and `cubeOffset` 
	# describe its dimension.
	cube : null
	cubeSize : null
	cubeOffset : null

	# Each bucket is 64x64x64 large.
	BUCKET_WIDTH : 64

	# Retuns the index of the bucket (in the cuboid) which holds the
	# point you're looking for.
	bucketIndex : (x, y, z) ->
		
		_bucket_width = @BUCKET_WIDTH
		_offset       = @cubeOffset
		_size         = @cubeSize

		(x / _bucket_width - _offset[0] >> 0) + 
		(y / _bucket_width - _offset[1] >> 0) * _size[0] + 
		(z / _bucket_width - _offset[2] >> 0) * _size[0] * _size[1]
	
	# Returns the index of the point (in the bucket) you're looking for.
	pointIndex : (x, y, z) ->
		
		_bucket_width = @BUCKET_WIDTH

		(x % _bucket_width >> 0) +
		(y % _bucket_width >> 0) * _bucket_width +
		(z % _bucket_width >> 0) * _bucket_width * _bucket_width

	# Want to add data? Make sure the cuboid is big enough.
	# This one is for passing real point coordinates.
	extendPoints : (x_min, y_min, z_min, x_max, y_max, z_max) ->
		
		_bucket_width = @BUCKET_WIDTH

		@extendCube(
			x_min / _bucket_width >> 0,
			y_min / _bucket_width >> 0,
			x_min / _bucket_width >> 0,
			x_max / _bucket_width >> 0,
			y_max / _bucket_width >> 0,
			z_max / _bucket_width >> 0
		)
	
	# And this one is for passing bucket coordinates.
	extendCube : (x0, y0, z0, x1, y1, z1) ->
		
		_cube   = @cube
		_offset = @cubeOffset
		_size   = @cubeSize

		# First, we calculate the new dimension of the cuboid.
		if _cube?
			cubeOffset = [
				Math.min(x0, x1, _offset[0])
				Math.min(y0, y1, _offset[1])
				Math.min(z0, z1, _offset[2])
			]
			cubeSize = [
				Math.max(x0, x1, _offset[0] + _size[0]) - cubeOffset[0] + 1
				Math.max(y0, y1, _offset[1] + _size[1]) - cubeOffset[1] + 1
				Math.max(z0, z1, _offset[2] + _size[2]) - cubeOffset[2] + 1
			]
		else
			cubeOffset = [
				Math.min(x0, x1)
				Math.min(y0, y1)
				Math.min(z0, z1)
			]
			cubeSize = [
				Math.max(x0, x1) - cubeOffset[0] + 1
				Math.max(y0, y1) - cubeOffset[1] + 1
				Math.max(z0, z1) - cubeOffset[2] + 1
			]

		# Then we reorganize the existing buckets.
		cube = []
		for z in [0...cubeSize[2]]
			for y in [0...cubeSize[1]]
				for x in [0...cubeSize[0]]
					cube.push if _cube?
						index =
							(x - _offset[0]) +
							(y - _offset[1]) * _size[0] +
							(z - _offset[2]) * _size[0] * _size[1] 
					else
						null
					
		@cube       = cube
		@cubeOffset = cubeOffset
		@cubeSize   = cubeSize

	# Get or set a color value of a point.
	# Keep in mind that 0 represents a undefined value.
	# Real color values range from 1 to 2 -- with black being 0 and white 1.
	value : (x, y, z, newValue) ->

		_cube = @cube

		unless _cube?
			throw "cube fault" if newValue?
			return 0

		bucketIndex = @bucketIndex(x, y, z)
		bucket      = _cube[bucketIndex]

		unless newValue?
			if bucket?
				bucket[@pointIndex(x, y, z)]
			else
				0
		else
			if 0 <= bucketIndex < @cube.length
				unless bucket?
					_bucket_width = @BUCKET_WIDTH
					bucket = _cube[bucketIndex] = new Float32Array(_bucket_width * _bucket_width * _bucket_width)
				bucket[@pointIndex(x, y, z)] = newValue
			else
				# Please handle cuboid expansion explicitly.
				throw "cube fault"

# This loads and caches meshes.
#
# **Mixins**: Model.Cacheable
Model.Mesh =
	
	get : (name, callback) ->

		unless @tryCache name, callback

			request url : "/assets/mesh/#{name}", responseType : 'arraybuffer', (err, data) =>
				if err
					callback err 

				else
				  # To save bandwidth meshes are transferred in a binary format.
					header  = new Uint32Array(data, 0, 3)
					coords  = new Float32Array(data, 12, header[0])
					colors  = new Float32Array(data, 12 + header[0] * 4, header[1])
					indexes = new Uint16Array(data, 12 + 4 * (header[0] + header[1]), header[2])

					# `Model.Cacheable.cachingCallback`
					@cachingCallback(name, callback)(null, coords, colors, indexes)

# This creates a Triangleplane
# It is essentially a square with a grid of vertices. Those vertices are
# connected through triangles. Cuz that's how u do it in WebGL.
Model.Trianglesplane =
	
	get : (width, callback) ->

		# Each three elements represent one vertex.
		vertices = new Uint16Array(width * width * 3)

		# Each three elements represent one triangle.
		# And each vertex is connected through two triangles.
		indices = new Uint16Array(width * width * 6)
		currentPoint = 0
		currentIndex = 0

		for y in [0...width]
			for x in [0...width]
				# We don't draw triangles with the last point of an axis.
				if y < (width - 1) and x < (width - 1)
					indices[currentIndex * 2 + 0] = currentPoint
					indices[currentIndex * 2 + 1] = currentPoint + 1 
					indices[currentIndex * 2 + 2] = currentPoint + width
					indices[currentIndex * 2 + 3] = currentPoint + width
					indices[currentIndex * 2 + 4] = currentPoint + width + 1
					indices[currentIndex * 2 + 5] = currentPoint + 1
					
					vertices[currentIndex + 0] = x
					vertices[currentIndex + 1] = y
					vertices[currentIndex + 2] = 0

				currentPoint++
				currentIndex += 3

		callback(null, vertices, indices)

# This loads and caches a pair (vertex and fragment) shaders
#
# **Mixins**: Model.Cacheable
Model.Shader =

	get : (name, callback) ->
		
		unless @tryCache name, callback
		
			loadedData = []
			request url : "/assets/shader/#{name}.vs", (@synchronizingCallback loadedData, (@cachingCallback name, callback))
			request url : "/assets/shader/#{name}.fs", (@synchronizingCallback loadedData, (@cachingCallback name, callback))


# This takes care of the route. 
Model.Route =
	
	dirtyBuffer : []
	route : null
	startDirection : null
	startPosition : null
	id : null

	# Returns a `position` and `direction` to start your work.
	initialize : (callback) ->
		@initialize = _.once2(@_initialize)
		@initialize(callback)

	_initialize : (doneCallback) ->

		request
			url : '/route/initialize'
			,
			(err, data) =>
				
				callback = doneCallback(err)
				
				unless err
					try
						data = JSON.parse data

						@route          = [ data.position ]
						@id             = data.id
						@startDirection = data.direction
						@startPosition  = data.position
						
						callback(null, data.position, data.direction)
					catch ex
						callback ex
	
	# Pulls a route from the server.
	pull : ->
		request	url : "/route/#{@id}", (err, data) =>
			unless err
				@route = JSON.parse data

	
	# Pushes th buffered route to the server. Pushing happens at most 
	# every 30 seconds.
	push : ->
		@push = _.throttle2 @_push, 30000
		@push()

	_push : ->
		unless @pushing
			@pushing = true

			@lazyInitialize (err) =>
				return if err

				transportBuffer = @dirtyBuffer
				@dirtyBuffer = []
				request
					url : "/route/#{@id}"
					contentType : 'application/json'
					method : 'POST'
					data : transportBuffer
					,
					(err) =>
						@pushing = false
						if err
							@dirtyBuffer = transportBuffer.concat @dirtyBuffer
							@push()
	
	# Add a point to the buffer. Just keep adding them.
	put : (position, callback) ->
		
		@lazyInitialize (err) =>
			return callback(err) if err

			@route.push [Math.round(position[0]), Math.round(position[1]), Math.round(position[2])]
			@dirtyBuffer.push position
			@push()


# Helps to make sure that a bunch of callbacks have returned before 
# your code continues.
Model.Synchronizable = 	

	synchronizingCallback : (loadedData, callback) ->
		loadedData.push null
		loadedData.counter = loadedData.length
		i = loadedData.length - 1

		(err, data) ->
			if err
				callback err unless loadedData.errorState
				loadedData._errorState = true
			else
				loadedData[i] = data
				unless --loadedData.counter
					callback null, loadedData...

# Hook up your callbacks with a caching mechansim. So: First check the
# cache with `tryCache`, then do your stuff and hook up the 
# `cachingCallback` to your callbacks.
Model.Cacheable =
	
	cache : {}

	cachingCallback : (cache_tag, callback) ->
		(err, args...) =>
			if err
				callback err
			else
				@cache[cache_tag] = args
				callback null, args...
	
	tryCache : (cache_tag, callback) ->
		if (cached = @cache[cache_tag])?
			_.defer -> callback null, cached...
			return true
		else
			return false

# Mixin hook ups
_.extend Model.Binary, Model.Synchronizable
_.extend Model.Mesh, Model.Cacheable
_.extend Model.Shader, Model.Synchronizable
_.extend Model.Shader, Model.Cacheable
