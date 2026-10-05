// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { createInitialState as createXiangqiState } from "./engine.ts";
import { XiangqiLobby } from "./XiangqiLobby.jsx";

const mock = vi.hoisted(() => ({ client: null, room: null, calls: [] }));
vi.mock("./onlineClient.js", async original => ({
  ...await original(),
  XiangqiClient: class {
    constructor() { mock.client = this; }
    close() {} disconnect() {}
    async request(type,payload) {
      mock.calls.push({type,payload});this.onStatus?.(true);
      if(type === "xq_room_create") return {room:mock.room,playerId:"host"};
      if(type === "xq_room_ready") mock.room={...mock.room,revision:mock.room.revision+1,players:mock.room.players.map(player=>({...player,ready:true}))};
      if(type === "xq_room_start") mock.room={...mock.room,revision:mock.room.revision+1,status:"playing"};
      return {room:mock.room};
    }
  }
}));
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
let host,root;
afterEach(async()=>{await act(()=>root?.unmount());host?.remove();root=null;localStorage.clear();window.history.replaceState(null,"","/");mock.calls=[];});
const click = async name => act(()=>[...host.querySelectorAll("button")].find(button=>button.textContent===name).click());
async function render() {
  window.history.replaceState(null,"","/");localStorage.clear();
  mock.room={roomCode:"ABC234",status:"waiting",hostId:"host",revision:0,humanCount:1,difficulty:"hard",visibility:"private",seats:{red:{kind:"bot"},black:{kind:"human",playerId:"host"}},players:[{id:"host",name:"Commander",faction:"black",ready:false,connected:true}],gameState:createXiangqiState()};
  host=document.createElement("div");document.body.append(host);root=createRoot(host);
  await act(()=>root.render(<XiangqiLobby renderMatch={props=><div data-match="true" data-can-act={String(props.online.canAct)}><button onClick={props.onSetup}>Room details</button></div>} />));
}
it("creates the chosen Xiangqi room, readies it, starts it, and guards the bot's opening turn",async()=>{
  await render();await click("Online rooms");
  const name=host.querySelector('input[placeholder="Your name"]');
  await act(()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(name,"Commander");name.dispatchEvent(new Event("input",{bubbles:true}));});
  const kingdom=host.querySelector("select");
  await act(()=>{kingdom.value="black";kingdom.dispatchEvent(new Event("change",{bubbles:true}));});
  await act(()=>[...host.querySelectorAll(".xiangqi-lobby-difficulties button")].find(button=>button.textContent.includes("Hard")).click());
  await click("Create room");
  const request=mock.calls.find(call=>call.type==="xq_room_create");
  expect(request.payload).toMatchObject({name:"Commander",humanCount:1,faction:"black",difficulty:"hard"});
  expect(host.textContent).toContain("Room ABC234");expect(host.textContent).toContain("Hard bot");
  await click("I’m ready");await click("Start match");
  expect(host.querySelector("[data-match]").dataset.canAct).toBe("false");
  await act(()=>mock.client.onPacket({type:"xq_room_state",payload:{room:{...mock.room,revision:3,gameState:{...mock.room.gameState,turn:"black"}}}}));
  expect(host.querySelector("[data-match]").dataset.canAct).toBe("true");
  await click("Room details");expect(host.textContent).toContain("Return to board");
});
it("shows a clear error when room creation has no display name",async()=>{
  await render();await click("Online rooms");await click("Create room");
  expect(host.querySelector('[role="alert"]').textContent).toContain("Enter a display name");
  expect(mock.calls.some(call=>call.type==="xq_room_create")).toBe(false);
});
