import axios from "axios";
import dotenv from "dotenv";
import _ from 'lodash';
import FormData from "form-data";
import { createReadStream, readFileSync } from "fs";

dotenv.config();

// add agent name, id and group to get tickets from. the name of the group should match .json file
const agents = [
  {
    name: 'John Doe',
    id: 9876,
    group: 'group_1'
  },
];
const minutes = 15; 
const ticketsPerAgent = 16; // 16 for 4 hours

const groups = [...new Set(agents.map((agent) => agent.group))];
const createTicketUrl = process.env.URL;
let messages;
let currMsgId = 0;

const makeFormData = ({ subject, messagePath, agent, files }) => {
  const formData = new FormData();
  formData.append('api_token', process.env.API_TOKEN);
  formData.append('subject', subject);
  formData.append('message', readFileSync(messagePath, 'utf-8'));
  formData.append('client_id', process.env.CLIENT_ID);
  formData.append('assignee_id', agent);
  formData.append('channel_id', process.env.CHANNEL_ID);
  files.forEach(fpath => {
    formData.append('files[]', createReadStream(fpath));
  });

  return formData;
};

const sendTicket = (url, formData) => {
  axios.post(url, formData, { headers: formData.getHeaders() })
  .then(({ data }) => {
    console.log(data);
  });
};

const run = () => {
  sendTicket(createTicketUrl, makeFormData(messages[currMsgId]));
  currMsgId += 1;
  if (currMsgId < messages.length) {
    if (currMsgId % agents.length === 0) {
      setTimeout(run, 1000 * 60 * minutes);
    } else {
      run();
    }
  }
};

const prepData = (groups) => {
  const catalogues = groups.map((group) => {
    const agentsInGroup = agents.filter(a => (a.group === group));
    const groupArr = JSON.parse(readFileSync(`./mocks/${group}.json`));
    groupArr.forEach((obj, i) => {
      const idx = i >= agentsInGroup.length ? i % agentsInGroup.length : i;
      obj.agent = agentsInGroup[idx].id;
    });
    return { group, numOfAgents: agentsInGroup.length, tickets: groupArr };
  });
  const data = [];
  const pointers = groups.reduce((acc, group) => ({...acc, [group]: 0}), {});
  for (let i = 0; i < ticketsPerAgent; i++) {
    for (let j = 0; j < catalogues.length; j++) {
      const { group, tickets, numOfAgents } = catalogues[j];
      const id = pointers[group];
      data.push(...tickets.slice(id, id + numOfAgents));
      pointers[group] += numOfAgents;
    }
  }
  return data;
};

function init() {
  messages = prepData(groups);
  run();
};

init();