print = console.log;

// define canvases for 2D and 3D map rendering
let canvas;
let context;
let canvas_rect;

let canvas_offset_x, canvas_offset_y;

let transformations = [];

class Matrix {
	_matrix = [[1,0,0],[0,1,0],[0,0,1]];

	constructor(matrix){
		// from 2D array
		if(matrix instanceof Array)
			this._matrix = matrix;

		// from Matrix object
		if(matrix instanceof Matrix)
			this._matrix = matrix._matrix;

		// generate n by n identity
		if(typeof matrix == 'number')
			this._matrix = [...Array(matrix).keys()].map(y => [...Array(matrix).keys()].map(x => x == y ? 1 : 0));
	}

	dot(vector){

		if(vector.length != this._matrix[0].length){
			console.log(`Vector and matrix shape are incompatible for vector ${vector} and matrix ${this._matrix}`);
		}

		let size = vector.length;
		let v = [...Array(size).keys()].map(x => 0);

		for(let row = 0; row < size; row++){
			for(let col = 0; col < size; col++){
				v[row] += vector[col] * this._matrix[row][col];
			}
		}

		return v;
	}

	matmul(right){
		let l = this._matrix;
		let r = right._matrix;

		let depth = r.length
		let width = r[0].length;
		let height = l.length;

		// ensure matching matrix dimensions
		if(l[0].length != r.length){
			console.log(`Cannot multiply matrices with sizes ${l.length} by ${l[0].length} and ${r.length} by ${r[0].length}`);
			return null;
		}

		let n = [...Array(height).keys()].map(y => [...Array(width).keys()].map(x => 0));

		for(let row = 0; row < height; row++){
			for(let col = 0; col < width; col++){
				for(let i = 0; i < depth; i++)
					n[row][col] += l[row][i] * r[i][col];
			}
		}

		return new Matrix(n);
	}

	inverse(){
		let m = this._matrix;

		// ensure square matrix
		if(m.length != m[0].length){
			console.log(`Cannot inverse non square matrix of size ${m.length} by ${m[0].length}`);
			return null;
		}

		let size = m.length;

		// two identity matrices
		let l = [...Array(size).keys()].map(y => [...Array(size).keys()].map(x => m[y][x]));
		let r = [...Array(size).keys()].map(y => [...Array(size).keys()].map(x => x == y ? 1 : 0));
		
		// use gaussian elimination to reduce original matrix to the identity matrix whilst generating the inverse
		// for each row perform elementary row operations so that 
		// the diagonal element is 0 and row_2 elements in that column are 0
		for(let row = 0; row < size; row++){

			// for clarity
			let col = row;

			// diagonal element
			let e = l[row][col];

			// if the diagonmal element is 0, swap it with a row from below that has a non zero in that column
			if(e == 0){
				for(let below = row + 1; below < size; below++){
					let new_e = l[below][col];

					// if this row below has a non zero in teh column, swap it
					if(new_e != 0){
						let temp = l[row];
						l[row] = l[below];
						l[below] = temp;
						
						temp = r[row];
						r[row] = r[below];
						r[below] = temp;

						break;
					}
				}

				// get new diagonal element and check if its non-zero
				e = l[row][col];
				if(e == 0){
					console.log(`Cannot compute inverse of singular matrix: ${m}`);
					return null;
				}
			}

			// scale this row to make the diagonal 1
			for(let i = 0; i < size; i++){
				l[row][i] /= e;
				r[row][i] /= e;
			}

			// subtract this row scaled from row_2 rows to make the elements in
			// this column 0
			for(let row_2 = 0; row_2 < size; row_2++){

				if(row_2 == row)
					continue;

				let v = l[row_2][col];

				for(let i = 0; i < size; i++){
					l[row_2][i] -= v*l[row][i];
					r[row_2][i] -= v*r[row][i];
				}

			}
		}

		// in converting l to the identiry r was converted into the inverse
		return new Matrix(r);
	}
};

class Transformation {

	matrix;
	parameters = {};
	container;
	matrix_view;
	editor_view;

	renderEditor(){console.log('renderEditor() not implemented');}
	compileMatrix(){console.log('compileMatrix() not implemented');}

	render(){

		this.container = document.createElement('div');
		this.container.classList.add('tranform_container');
		this.container.transformation = this;

		this.matrix_view = document.createElement('div');
		this.editor_view = document.createElement('div');

		this.container.appendChild(this.matrix_view);
		this.container.appendChild(this.editor_view);

		this.renderMatrix();
		this.renderEditor();

		return this.container;
	}
	
	stingifyMatrix(){
		return [...Array(3).keys()].map(y => [...Array(3).keys()].map(x => this.matrix._matrix[y][x]));
	}

	renderMatrix(){

		let matrix_strings = this.stingifyMatrix();

		let html_matrix = '<table>';
		for(let row = 0; row < matrix_strings.length; row++){
			html_matrix += '<tr>';
			for(let col = 0; col < matrix_strings[row].length; col++){
				html_matrix += `<td>${matrix_strings[row][col]}</td>`;
			}
			html_matrix += '</tr>';
		}
		html_matrix += '</table>';

		this.matrix_view.innerHTML = html_matrix;
	}

	processEdit(key, value){
		this.parameters[key] = value;
		this.compileMatrix();
		this.renderMatrix();
	}

};

class Rotation extends Transformation{

	parameters = {r: 0};

	renderEditor(){
		this.editor_view.innerHTML = `<input type="range" min="0" max="360" value="${this.parameters.r}" oninput="changeTransformationParameter(event, this, 'r')"></input>`;
	}

	compileMatrix(){
		let r = this.parameters.r * Math.PI / 180 / 10;

		this.matrix = new Matrix([
			[Math.cos(r), -Math.sin(r), 0],
			[Math.sin(r), Math.cos(r), 0],
			[0,0,1],
		]);
	}

}

function changeTransformationParameter(event, element, key){

	let transformation_container = element.closest('.tranform_container');
	let transformation = transformation_container.transformation;

	transformation.processEdit(key, element.value);

	renderCanvas();

}

// initialise canvases and begin rendering
function init(){
	
	// input: 2D map, output: 3D rendering
	canvas = document.getElementById('canvas');

	context = canvas.getContext('2d');

	// set coordinate system of input to origin at bottom left
	canvas_offset_x = Math.floor(canvas.width/2);
	canvas_offset_y = Math.floor(canvas.height/2);
	context.transform(1,0,0,-1,canvas_offset_x,canvas_offset_y);
	// context.transform(block_size,0,0,-block_size,0,canvas.width)

	canvas_rect = canvas.getBoundingClientRect();

	transformations.push(new Rotation());

	render();
}

function render(){
	renderEditors();
	renderCanvas();
}

function renderEditors(){
	let transform_list = document.getElementById('transform_list');

	while(transform_list.firstChild)
		transform_list.removeChild(transform_list.firstChild);

	for(let t of transformations){
		t.compileMatrix();
		transform_list.appendChild(t.render());
	}
}

// render the canvas by calculating the transformation inverse and choosing a 
// color for the corresppnding pixel based on the inverse location
function renderCanvas(){

	let matrix = new Matrix(3);

	let s = 10;
	let scale = new Matrix([[s,0,0],[0,s,0],[0,0,1]]);

	matrix = scale;

	for(let t of transformations){
		t.compileMatrix();
		matrix = matrix.matmul(t.matrix);
	}

	let inverse = matrix.inverse();

	let corners = [
		inverse.dot([-canvas_offset_x, -canvas_offset_y, 1]),
		inverse.dot([+canvas_offset_x, -canvas_offset_y, 1]),
		inverse.dot([+canvas_offset_x, +canvas_offset_y, 1]),
		inverse.dot([-canvas_offset_x, +canvas_offset_y, 1]),
	];

	let boundary = {
		left:   Math.min(...corners.map(v=>v[0])),
		right:  Math.max(...corners.map(v=>v[0])),
		top:    Math.max(...corners.map(v=>v[1])),
		bottom: Math.min(...corners.map(v=>v[1])),
	}
	
	context.fillStyle = '#000000';
	context.fillRect(-canvas_offset_x, -canvas_offset_y, 2*canvas_offset_x, 2*canvas_offset_y);
	for(let x = boundary.left; x < boundary.right; x++){
		for(let y = boundary.bottom; y < boundary.top; y++){
			let [tx, ty, tz] = matrix.dot([x, y, 1]);

			context.fillStyle = '#888888';
			context.beginPath();
			context.arc(tx,ty,1,0,2*Math.PI);
			context.fill();
		}
	}



	
}

