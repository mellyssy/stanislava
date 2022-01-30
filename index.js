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
    name: 'example agent',
    id: 1111,
    group: 'example group'
  }
];
// set number of minutes to wait
const minutes = 15; 
const groups = [...new Set(agents.map((agent) => agent.group))];

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

const run = (i = 0) => {
  agents.forEach(({ group, id}) => {
    const data = catalogues[group][i];
    
    if (data) {
      sendTicket(createTicketUrl, makeFormData(data, id));
    }
  });
  
  if (i + 1 === max) {
    return;
  }

  setTimeout(() => run(i + 1), 1000 * 60 * minutes);
};

const prepData = (groups) => {
  return groups.reduce((acc, group) => {
    const data = JSON.parse(readFileSync(`./mocks/${group}.json`));
    acc[group] = data;
    return acc;
  }, {});
};

const catalogues = prepData(groups);
const max = Math.max(...(Object.keys(catalogues).reduce((acc, group) => {
  return [...acc, catalogues[group].length];
}, [])));

run();