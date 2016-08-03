/**
 * Created by neta on 7/27/16.
 */

export interface IPlayer{name:string, gender:string, currScene:string, itemIdInHand:string}
export interface IArtifact{id:string,shown:boolean, src:string, beingUsedBy:number, required:{}[], actions:{any}[]}

export class GameState {
    private bags:Object[][]=[];   //decide later the exact item structure
    private players:IPlayer[]=[];
    private scenes:{};
    private modals:{};
	private cb;

    //to put in some utility file
    flatten = list => list.reduce(
        (acc, curr) => acc.concat(Array.isArray(curr) ? this.flatten(curr) : curr), []);

    constructor(scenesData:any, cb, playerName?:string, playerGender?:string, playerCurrScene:string = 'classroom' ){
        this.scenes = scenesData.hotSpots;
        this.modals = scenesData.modals;
		this.cb=cb;
        if (playerGender){
            this.addPlayer(playerName,playerGender,playerCurrScene);
        }
    }

    //the mother of all the game logic
    sendStateToUsers(){
		this.cb({bags:this.bags,players:this.players,scenes:this.scenes, modals:this.modals});
	}

	findArtifactById(artifactId:string){
        let theArtifact:IArtifact;
        for (var scene in this.scenes) {
            let foundItems = this.scenes[scene].filter((artifact)=>artifact.id===artifactId);
            if(foundItems.length){
                theArtifact = foundItems[0];
                break;
            }
        }
        return theArtifact;

    }

	userClick(userId:number, artifactId:string){
        console.log('game state totally knows ' + artifactId + ' was clicked');
        const userScene = this.players[userId].currScene;
        let clickedArtifact:IArtifact;
        for (var scene in this.scenes) {
            let foundItems = this.scenes[scene].filter((artifact)=>artifact.id===artifactId);
            if(foundItems.length){
                clickedArtifact = foundItems[0];
                break;
            }
        }
        // let clickedArtifact:IArtifact = this.scenes[userScene].filter((artifact)=>artifact.id===artifactId)[0];
        console.log('***clicked***', clickedArtifact);
        //if the clicked artifact is shown (prevent bugs due to "clicking" an already hidden object due to communication lag)
		if(clickedArtifact.shown){


            if ((!clickedArtifact.required.length && !this.players[userId].itemIdInHand) || clickedArtifact.required.indexOf(this.players[userId].itemIdInHand) >= 0){

                //this is the place to handle clickedArtifact.actions
                if(this.players[userId].itemIdInHand){
                    this.removeItemFromBag(this.players[userId].itemIdInHand);
                }

                clickedArtifact.actions.forEach((action:any)=>{
                    switch (Object.keys(action)[0]){
                        case 'collect':
                            this.bags[userId].push(this.findArtifactById(action.collect));
                            this.unSelectItemInBag(userId);
                            console.log('totally collecting!');
                            break;
                        case 'loadScene':
                            this.players[userId].currScene = action.loadScene;
                            break;
                        case 'loadModal':
                            console.log('loading modal', action.loadModal);
                            this.players[userId].currScene = action.loadModal;
                            break;
                        case 'showHotSpot':
                            this.unSelectItemInBag(userId);
                            this.findArtifactById(action.showHotSpot).shown = true;
                            break;
                        case 'hideHotSpot':
                            this.unSelectItemInBag(userId);
                            this.findArtifactById(action.showHotSpot).shown = false;
                            break;
                        case 'objectMessage':
                            console.log('objectMessage', action.objectMessage);
                            this.objectMessage(userId, action.objectMessage);
                            break;
                    }
                });
            }
		}

        //here we shuld emmit to all the users about the new state
		this.sendStateToUsers();
    }

    //a happy new player joind the room
    addPlayer(name:string, gender:string, currScene:string = 'classroom'){
        this.players.push({name:name, gender:gender, currScene:currScene, itemIdInHand:null});
        this.bags.push([]);
		
        return {bags:this.bags, players:this.players, scenes:this.scenes, modals:this.modals, userId:this.players.length - 1};
    }

    //an item in the bag section was clicked. the user can use it if no one else is using this
    bagedArtifactClicked(userId, artifactId){
		const clickedArtifact:IArtifact = this.flatten(this.bags).filter((artifact:IArtifact)=>artifact.id===artifactId)[0];

        //if the clicked artifact is shown (prevent bugs due to "clicking" an already hidden object due to communication lag)
        if(clickedArtifact.beingUsedBy=== -1) {
            clickedArtifact.beingUsedBy = userId;
            this.players[userId].itemIdInHand = clickedArtifact.id;
        }
        else if(this.players[userId].itemIdInHand === clickedArtifact.id){
            this.unSelectItemInBag(userId);

        } else{
            console.log('someone else is playing with that '+clickedArtifact.id);
        }
        //here we should emmit to all the users about the new state
		this.sendStateToUsers();
    };

    unSelectItemInBag(userId:number){
        if(this.players[userId].itemIdInHand){
            this.bags.forEach((bag)=>{
                bag.forEach((artifact:IArtifact)=>{
                    if(artifact.id === this.players[userId].itemIdInHand)
                        artifact.beingUsedBy = -1;
                        console.log('artifact.id:', artifact.id);
                        });
            });
            this.players[userId].itemIdInHand = '';
        }
    }

    removeItemFromBag(artifactId:string){
        console.log('removing:', artifactId);
        this.bags = this.bags.map((bag:IArtifact[]) => {
            return bag.filter(
                artifact => {
                    console.log('remrem', artifact);
                    return artifact.id !== artifactId})});
    }
    objectMessage(userId, message){

    }
}

module.exports = GameState;