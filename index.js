import axios from "axios";
import dotenv from "dotenv";
import _ from 'lodash';
import FormData from "form-data";
import { createReadStream, readFileSync } from "fs";

dotenv.config();
const createTicketUrl = process.env.URL;

// add agent name, id and group to get tickets from. the name of the group should match .json file
const agents = [
  {
    name: 'example name',
    id: 2222,
    group: 'group_name'
  },
];
// set number of minutes to wait
const minutes = 15; 

const groups = [...new Set(agents.map((agent) => agent.group))];
const pointers = groups.reduce((acc, group) => ({...acc, [group]: 0}), {});
let catalogues, maxMessages, currMsgIdx = 0;

const makeFormData = ({ subject, messagePath, files }, agent) => {
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
  const agentIdx = currMsgIdx % agents.length; 
  const { group, id } = agents[agentIdx];
  const ticketIdx = pointers[group];
  const data = catalogues[group][ticketIdx]; 
  sendTicket(createTicketUrl, makeFormData(data, id));
  pointers[group] += 1;
  currMsgIdx += 1;
  if (currMsgIdx < maxMessages) {
    if (currMsgIdx % agents.length === 0) {
      setTimeout(run, 1000 * 60 * minutes);
    } else {
      run();
    }
  }
};

const prepData = (groups) => {
  const catalogues = groups.reduce((acc, group) => {
    const data = JSON.parse(readFileSync(`./mocks/${group}.json`));
    acc[group] = data;
    return acc;
  }, {});
  return catalogues;
};

function init() {
  catalogues = prepData(groups);
  maxMessages = Object.keys(catalogues).reduce((acc, cat) => acc += catalogues[cat].length, 0);
  run();
};

init();