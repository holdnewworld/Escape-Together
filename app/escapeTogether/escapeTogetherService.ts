import { Injectable } from '@angular/core';
import { GameState } from '../../server/gameState';
import * as io from 'socket.io-client';
import {IArtifact} from "../../server/gameState";
import {Http} from '@angular/http';

declare var pannellum: any;

@Injectable()
export class EscapeTogetherService{
	
	// private gameState = new GameState([[{id:'pikachu', shown:true, src:'img/artifacts/Pikachu_256px.png', beingUsedBy:-1}]], 'gramsci', 'queer', 0);
	private _bags = [];
	private socket;
	private _userId:number;
    private _currScene:string;
	public view:any;

	constructor(private http:Http){
		window.addEventListener('message' , (msg)=>{
			console.log('on message', msg.data);
			this.artifactClicked(msg.data);
		});

	}
	start(){
	 	this.socket = io('localhost:3003/game');
		this.socket.on('state update', (msg)=>{
			console.log('state updated:', msg);

			if(msg.hasOwnProperty('userId'))
				this._userId = msg.userId;

			this._bags = msg.bags;

			const scene = msg.players[this._userId].currScene;

			if(this._currScene !== scene){
				this._currScene = scene;
				this.view = this.view.loadScene(scene, 0, 0, 100);
				this.view.on('load', ()=>{
					console.warn('load event fired to ',scene);
					msg.scenes[scene].forEach((artifact:IArtifact)=>{
						let hsHtml=(<HTMLElement>document.querySelector('#'+artifact.id));
						if(hsHtml) hsHtml.style.display = artifact.shown? 'block': 'none';
						else console.warn('#' + artifact.id+ ' not found in DOM in if');
					});
				});

			}

				msg.scenes[scene].forEach((artifact:IArtifact)=>{
					let hsHtml=(<HTMLElement>document.querySelector('#'+artifact.id));
					if(hsHtml) hsHtml.style.display = artifact.shown? 'block': 'none';
					else console.warn('#' + artifact.id+ ' not found in DOM');
				});


		});
	}

	loadPannellum(elId){
		return new Promise((resolve,reject) => {
			this.http.get('/server/json/data.json').toPromise().then((res:any) => {
				this.view = pannellum.viewer(elId, eval('(' + res._body + ')'));
				resolve();
				// this.view.on('load', resolve);
			});
		});
	}

	usedByOthers(artifact:IArtifact, userId:number):boolean{
		if((artifact.beingUsedBy !== -1) && (artifact.beingUsedBy !== userId) )	return true;
		return false;
	}

	bags(){return this._bags}

	userId(){return this._userId}

	artifactClicked(artifactId:string):void {
		this.socket.emit('userClick', artifactId);
		console.log('user click:', artifactId);
	}

	bagClicked(artifactId:string):void{
		this.socket.emit('bagedArtifactClicked', artifactId);
	}

	sceneToShow(){
		return 'img/scenes/garbage_key.jpg'
	}
}