namespace pixi_heaven.mesh {
	import GroupD8 = PIXI.GroupD8;

	/**
	 * The rope sprite allows you to hack a rope that behaves like a sprite
	 *
	 * ```
	 * let rope = new PIXI.mesh.Rope(PIXI.Texture.fromImage("snake.png"), 5, 2, vertical ? 2 : 0);
	 * rope.anchor.set(0.5, 0.5);
	 * rope.clearPoints(); // set them according to anchor
	 * rope.points[1].y = 15; // middle Y goes down
	 * rope.points[2].offset = 15; // shift is better
	 * rope.points[3].scale = 1.2; // scale a bit
	 * ```
	 *
	 * @class
	 * @extends PIXI.mesh.Rope
	 * @memberof PIXI.mesh
	 *
	 */
	export class Rope extends Plane {

		points: Array<RopePoint> = [];
		calculatedPoints: Array<RopePoint> = [];

		/**
		 * invalidates points on every updateTransform
		 * @member {boolean}
		 * @default true
		 */
		autoUpdate = true;

		/**
		 * @param {PIXI.Texture} texture - The texture to use on the rope.
		 * @param {number|PIXI.mesh.RopePoint[]} [verticesX=2] - How many vertices on diameter of the rope,
		 * you can also pass pre-created points here.
		 * @param {number} [verticesY=2] - How many vertices on meridian of the rope, make it 2 or 3
		 * @param {number} [direction=0] - Direction of the rope. See {@link PIXI.GroupD8} for explanation
		 */
		constructor(texture: PIXI.Texture, verticesX: Array<RopePoint> | number, verticesY: number = 2, direction = 0) {
			super(texture, (verticesX as any).length || verticesX, verticesY, direction);

			/*
			 * @member {PIXI.mesh.RopePoint[]} An array of points that determine the rope
			 */
			this.points = [];
			/*
			 * @member {PIXI.mesh.RopePoint[]} Generated points positions, useful as starting position for points
			 */
			this.calculatedPoints = [];

			if (verticesX instanceof Array) {
				this.points = verticesX;
				this.autoResetVertices = false;
			}

			this._checkPointsLen();

			if ((GroupD8 as any).isVertical(direction)) {
				(this._anchor as any)._x = 0.5;
			}
			else {
				(this._anchor as any)._y = 0.5;
			}

			this.refresh();
		}

		/**
		 * Updates the object transform for rendering
		 */
		updateTransform() {
			if (this.autoUpdate) {
				this._verticesID++;
			}
			this.refresh();
			this.containerUpdateTransform();
		}

		/**
		 * updates everything when anchor was changed
		 *
		 * @private
		 */
		_onAnchorUpdate() {
			this.reset();
		}

		/**
		 * sets default points coordinates
		 *
		 */
		_checkPointsLen() {
			const len = this._verticesX;
			const points = this.points;
			const calculatedPoints = this.calculatedPoints;

			if (points.length > len) {
				points.length = len;
			}

			while (points.length < len) {
				points.push(new RopePoint(0, 0, 0, 1.0));
			}

			if (calculatedPoints.length > len) {
				calculatedPoints.length = len;
			}

			while (calculatedPoints.length < len) {
				calculatedPoints.push(new RopePoint(0, 0, 0, 1.0));
			}
		}

		/**
		 * Refreshes the rope sprite mesh
		 *
		 * @param {boolean} [forceUpdate=false] if true, everything will be updated in any case
		 */
		refresh(forceUpdate = false) {
			// using "this.points" instead of old "ready" hack

			if (!this.points || this._texture.noFrame) {
				return;
			}

			if (this._lastWidth !== this.width
				|| this._lastHeight !== this.height) {
				this._lastWidth = this.width;
				this._lastHeight = this.height;
				if (this.autoResetVertices) {
					this.resetPoints();
				}
			}

			super.refresh(forceUpdate);
		}

		/**
		 * Calculate default position for points
		 */
		calcPoints() {
			const len = this._verticesX;
			const points = this.calculatedPoints;

			const dir = this._direction;

			const width = this.width;
			const height = this.height;

			const dx = GroupD8.uX(dir);
			const dy = GroupD8.uY(dir);

			const anchor = this._anchor as any;
			const offsetX = dx !== 0 ? 0.5 - anchor._x : 0;
			const offsetY = dy !== 0 ? 0.5 - anchor._y : 0;

			for (let i = 0; i < len; i++) {
				const t = (i - ((len - 1) * 0.5)) / (len - 1);

				points[i].x = ((t * dx) + offsetX) * width;
				points[i].y = ((t * dy) + offsetY) * height;
			}
		}

		/**
		 * sets default points coordinates
		 */
		resetPoints() {
			this.calcPoints();

			const len = this._verticesX;
			const points = this.points;
			const calculatedPoints = this.calculatedPoints;

			for (let i = 0; i < len; i++) {
				points[i].x = calculatedPoints[i].x;
				points[i].y = calculatedPoints[i].y;
			}
		}

		/**
		 * sets default shift - zero
		 */
		resetOffsets() {
			const points = this.points;
			const len = points.length;

			for (let i = 0; i < len; i++) {
				points[i].offset = 0.0;
			}

			for (let i = 0; i < len; i++) {
				points[i].scale = 1.0;
			}
		}

		/**
		 * clears rope points
		 */
		reset() {
			this._checkPointsLen();
			this.resetPoints();
			this.resetOffsets();

			super.reset();
		}

		/**
		 * Refreshes vertices of Rope mesh
		 */
		calcVertices() {
			const points = this.points;

			let lastPoint = points[0];
			let nextPoint;
			let normalX = 0;
			let normalY = 0;

			const width = this.width;
			const height = this.height;
			const vertices = this.calculatedVertices;
			const verticesX = this.verticesX;
			const verticesY = this.verticesY;
			const direction = this._direction;

			const vx = GroupD8.vX(direction);
			const vy = GroupD8.vY(direction);

			const wide = (vx * width) + (vy * height);

			const anchor = this._anchor as any;
			const normalOffset = wide * ((anchor._x * vx) + (anchor._y * vy));
			const normalFactor = -Math.abs(wide) / (verticesY - 1);

			for (let i = 0; i < verticesX; i++) {
				const point = points[i];
				// in case someone used Point instead of RopePoint
				const offset = points[i].offset || 0;
				const scale = (points[i].scale !== undefined) ? points[i].scale : 1.0;

				if (i < points.length - 1) {
					nextPoint = points[i + 1];
				}
				else {
					nextPoint = point;
				}

				normalY = -(nextPoint.x - lastPoint.x);
				normalX = nextPoint.y - lastPoint.y;

				const perpLength = Math.sqrt((normalX * normalX) + (normalY * normalY));

				normalX /= perpLength;
				normalY /= perpLength;

				for (let j = 0; j < verticesY; j++) {
					const ind = (i + (j * verticesX)) * 2;

					vertices[ind] = point.x + (normalX * (offset + (scale * (normalOffset + (normalFactor * j)))));
					vertices[ind + 1] = point.y + (normalY * (offset + (scale * (normalOffset + (normalFactor * j)))));
				}

				lastPoint = point;
			}
		}

		/**
		 * calculate colors if present
		 */
		calcColors() {
			const colors = this.colors;
			const points = this.points;

			const verticesX = this.verticesX;
			const verticesY = this.verticesY;

			let j = 0;
			for (let i = 0; i < verticesX; i++) {
				const color = points[i].color;
				if (color._currentUpdateID !== color._updateID) {
					color.updateTransformLocal();
					this.dirty++;
				}
				for (let j = 0; j < verticesY; j++) {
					const ind = (i + (j * verticesX)) * 2;
					colors[ind] = color.darkRgba;
					colors[ind + 1] = color.lightRgba;
				}
			}
		}

		enableColors() {
			for (let i = 0; i < this.points.length; i++) {
				this.points[i].color;
			}
			super.enableColors();
		}
	}
}