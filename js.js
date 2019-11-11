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
	parameter_configurations = {};

	container;
	matrix_view;
	editor_view;
	name = '';

	compileMatrix(){console.log('compileMatrix() not implemented');}

	render(){

		this.container = document.createElement('div');
		this.container.classList.add('tranform_container');
		this.container.transformation = this;

		let controls_view = document.createElement('div');
		controls_view.innerHTML = `<table><tr>`+
			`<td><a onclick="moveTransformationLeft(this)">&#8592;</a></td>`+
			`<td><a onclick="removeTransformation(this)">&#215;</a></td>`+
			`<td><a onclick="moveTransformationRight(this)">&#8594;</a></td>`+
			`</tr></table>`;
		let header_view = document.createElement('div');
		header_view.innerHTML = `<b>${this.name}</b>`;
		this.matrix_view = document.createElement('div');
		this.editor_view = document.createElement('div');

		this.container.appendChild(controls_view);
		this.container.appendChild(header_view);
		this.container.appendChild(this.matrix_view);
		this.container.appendChild(this.editor_view);

		this.renderMatrix();
		this.renderEditor();

		return this.container;
	}
	
	stingifyMatrix(){
		return [...Array(3).keys()].map(y => [...Array(3).keys()].map(x => this.matrix._matrix[y][x].toFixed(2)));
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

	renderEditor(){

		let html = '<table>';

		for(let [key, value] of Object.entries(this.parameter_configurations)){
			let parameters = Object.entries(value).map(([k,v])=>`${k}="${v}"`).join(' ');
			let input = `<input type="range" ${parameters} value="${this.parameters[key]}" oninput="changeTransformationParameter(this, '${key}')"></input>`;
			html += `<tr><td>${key}</td><td>${input}</td></tr>`;
		}

		html += '</table>';

		this.editor_view.innerHTML = html;
	}

	updateParameter(key, value){
		this.parameters[key] = value;
		this.compileMatrix();
		this.renderMatrix();
	}

};

class Translate extends Transformation{

	name = 'Translate';

	parameter_configurations = {
		dx: {min:-10, max:10, step:0.1},
		dy: {min:-10, max:10, step:0.1},
	};
	parameters = {dx: 0, dy: 0};

	compileMatrix(){
		let dx = Number(this.parameters.dx);
		let dy = Number(this.parameters.dy);

		this.matrix = new Matrix([
			[1, 0, dx],
			[0, 1, dy],
			[0, 0, 1],
		]);
	}

}

class Rotation extends Transformation{

	name = 'Rotation';
	
	parameter_configurations = {
		r: {min:0, max:360, step:2.5}
	};
	parameters = {r: 0};

	compileMatrix(){
		let r = this.parameters.r * Math.PI / 180;

		this.matrix = new Matrix([
			[Math.cos(r), -Math.sin(r), 0],
			[Math.sin(r), Math.cos(r), 0],
			[0,0,1],
		]);
	}
	
	stingifyMatrix(){

		let m = this.matrix._matrix;
		let r = Number(this.parameters.r).toFixed(0);

		return [
			[`cos(${r})`,`-sin(${r})`,'0'],
			[`sin(${r})`,`cos(${r})`,'0'],
			['0', '0', '1'],
		];
	}

}

class Scale extends Transformation{

	name = 'Scale';

	parameter_configurations = {
		s: {min:-2, max:5, step:0.02}
	};
	parameters = {s: 0};

	compileMatrix(){
		let s = Math.exp(this.parameters.s);

		this.matrix = new Matrix([
			[s, 0, 0],
			[0, s, 0],
			[0, 0, 1],
		]);
	}

}

class ScaleXY extends Transformation{

	name = 'Scale XY';

	parameter_configurations = {
		sx: {min:-2, max:5, step:0.02},
		sy: {min:-2, max:5, step:0.02},
	};
	parameters = {sx: 0, sy: 0};

	compileMatrix(){
		let sx = Math.exp(this.parameters.sx);
		let sy = Math.exp(this.parameters.sy);

		this.matrix = new Matrix([
			[sx, 0, 0],
			[0, sy, 0],
			[0, 0, 1],
		]);
	}

}

class Skew extends Transformation{

	name = 'Skew';

	parameter_configurations = {
		sx: {min:-5, max:5, step:0.02},
		sy: {min:-5, max:5, step:0.02},
	};
	parameters = {sx: 0, sy: 0};

	compileMatrix(){
		let sx = Number(this.parameters.sx);
		let sy = Number(this.parameters.sy);

		this.matrix = new Matrix([
			[1, sx, 0],
			[sy, 1, 0],
			[0, 0, 1],
		]);
	}

}

class Custom extends Transformation{

	name = 'Custom';

	parameter_configurations = {
		m11: {min:-1, max:1, step:0.01},
		m12: {min:-1, max:1, step:0.01},
		m13: {min:-1, max:1, step:0.01},
		m21: {min:-1, max:1, step:0.01},
		m22: {min:-1, max:1, step:0.01},
		m23: {min:-1, max:1, step:0.01},
		m31: {min:-1, max:1, step:0.01},
		m32: {min:-1, max:1, step:0.01},
		m33: {min:-1, max:1, step:0.01},
	};
	parameters = {
		m11: 1,
		m12: 0,
		m13: 0,
		m21: 0,
		m22: 1,
		m23: 0,
		m31: 0,
		m32: 0,
		m33: 1,
	};

	compileMatrix(matrix){
		let m11 = Number(this.parameters.m11);
		let m12 = Number(this.parameters.m12);
		let m13 = Number(this.parameters.m13);
		let m21 = Number(this.parameters.m21);
		let m22 = Number(this.parameters.m22);
		let m23 = Number(this.parameters.m23);
		let m31 = Number(this.parameters.m31);
		let m32 = Number(this.parameters.m32);
		let m33 = Number(this.parameters.m33);

		this.matrix = new Matrix([
			[m11, m12, m13],
			[m21, m22, m23],
			[m31, m32, m33],
		]);
	}

}

class Output extends Custom{
	
	name = 'Output';

	parameter_configurations = {};
}

function changeTransformationParameter(element, key){

	let transformation_container = element.closest('.tranform_container');
	let transformation = transformation_container.transformation;

	transformation.updateParameter(key, element.value);

	renderOutput();
	renderCanvas();

}

function removeTransformation(element){

	let transformation_container = element.closest('.tranform_container');
	let transformation = transformation_container.transformation;

	transformations.splice(transformations.indexOf(transformation), 1);
	
	render();
}

function moveTransformationLeft(element){

	let transformation_container = element.closest('.tranform_container');
	let transformation = transformation_container.transformation;
	let index = transformations.indexOf(transformation);
	
	if(0 < index && index <= transformations.length-1){
		let temp = transformations[index];
		transformations[index] = transformations[index-1];
		transformations[index-1] = temp;

		render();
	}

}

function moveTransformationRight(element){

	let transformation_container = element.closest('.tranform_container');
	let transformation = transformation_container.transformation;
	let index = transformations.indexOf(transformation);
	
	if(0 <= index && index < transformations.length-1){
		let temp = transformations[index];
		transformations[index] = transformations[index+1];
		transformations[index+1] = temp;

		render();
	}

}

function addTransformation(element, T){
	transformations.push(new T());
	render();
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

	render();
}

function render(){
	renderEditors();
	renderOutput();
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

function renderOutput(){

	let matrix = new Matrix(3);

	for(let t of transformations){
		t.compileMatrix();
		matrix = matrix.matmul(t.matrix);
	}

	let output = new Output();
	output.matrix = matrix;

	let output_matrix = document.getElementById('output');

	if(output_matrix.firstChild)
		output_matrix.removeChild(output_matrix.firstChild);
	output_matrix.appendChild(output.render());
}

// render the canvas by calculating the transformation inverse and choosing a 
// color for the corresppnding pixel based on the inverse location
function renderCanvas(){
	
	context.fillStyle = '#000000';
	context.fillRect(-canvas_offset_x, -canvas_offset_y, 2*canvas_offset_x, 2*canvas_offset_y);

	let matrix = new Matrix(3);

	let s = 50;
	let scale = new Matrix([[s,0,0],[0,s,0],[0,0,1]]);

	matrix = scale;

	renderGrid(matrix, '#333333', '#442200', '#222244', '#333333', 1, 2, 2);

	for(let t of transformations){
		t.compileMatrix();
		matrix = matrix.matmul(t.matrix);
		// matrix = t.matrix.matmul(matrix);
	}

	renderGrid(matrix, '#CCCCCC', '#FF8800', '#8888FF', '#DDDDDD', 1, 4, 3);
	
}

function renderGrid(matrix, c_line, c_line_x, c_line_y, c_point, l_width, a_width, p_width){

	let inverse = matrix.inverse();

	let corners = [
		inverse.dot([-canvas_offset_x, -canvas_offset_y, 1]),
		inverse.dot([+canvas_offset_x, -canvas_offset_y, 1]),
		inverse.dot([+canvas_offset_x, +canvas_offset_y, 1]),
		inverse.dot([-canvas_offset_x, +canvas_offset_y, 1]),
	];

	let boundary = {
		left:   Math.floor(Math.min(...corners.map(v=>v[0]))),
		right:  Math.ceil(Math.max(...corners.map(v=>v[0]))),
		top:    Math.ceil(Math.max(...corners.map(v=>v[1]))),
		bottom: Math.floor(Math.min(...corners.map(v=>v[1]))),
	}

	let points = {};

	for(let x = boundary.left-1; x <= boundary.right+1; x++){
		for(let y = boundary.bottom-1; y <= boundary.top+1; y++){
			points[[x, y, 1]] = matrix.dot([x, y, 1]);
		}
	}
	
	context.fillStyle = c_point;

	for(let x = boundary.left; x <= boundary.right; x++){
		for(let y = boundary.bottom; y <= boundary.top; y++){
			
			let [cx, cy, cz] = points[[x, y, 1]];
			let [rx, ry, rz] = points[[x+1, y, 1]];
			let [tx, ty, tz] = points[[x, y+1, 1]];

			context.strokeStyle = y == 0 ? c_line_x : c_line;
			context.lineWidth = y == 0 ? a_width : l_width;
			context.beginPath();
			context.moveTo(cx,cy);
			context.lineTo(rx,ry);
			context.stroke();
			
			context.strokeStyle = x == 0 ? c_line_y : c_line;
			context.lineWidth = x == 0 ? a_width : l_width;
			context.beginPath();
			context.moveTo(cx,cy);
			context.lineTo(tx,ty);
			context.stroke();

			context.beginPath();
			context.arc(cx, cy, p_width, 0, 2*Math.PI);
			context.fill();
		}
	}
}