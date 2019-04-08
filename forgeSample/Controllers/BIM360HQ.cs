/////////////////////////////////////////////////////////////////////
// Copyright (c) Autodesk, Inc. All rights reserved
// Written by Forge Partner Development
//
// Permission to use, copy, modify, and distribute this software in
// object code form for any purpose and without fee is hereby granted,
// provided that the above copyright notice appears in all copies and
// that both that copyright notice and the limited warranty and
// restricted rights notice below appear in all supporting
// documentation.
//
// AUTODESK PROVIDES THIS PROGRAM "AS IS" AND WITH ALL FAULTS.
// AUTODESK SPECIFICALLY DISCLAIMS ANY IMPLIED WARRANTY OF
// MERCHANTABILITY OR FITNESS FOR A PARTICULAR USE.  AUTODESK, INC.
// DOES NOT WARRANT THAT THE OPERATION OF THE PROGRAM WILL BE
// UNINTERRUPTED OR ERROR FREE.
/////////////////////////////////////////////////////////////////////

using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Autodesk.Forge;
using Newtonsoft.Json.Linq;
using RestSharp;
using System.Text;
using System.Net;
using Autodesk.Forge.Model;
using System.Collections.Generic;

namespace forgeSample.Controllers
{
    public class BIM360HQController : ControllerBase
    {
        private const string BASE_URL = "https://developer.api.autodesk.com";

        [HttpGet]
        [Route("api/forge/bim360/accounts/{hubId}/projects")]
        public async Task<JArray> GetProjectsAsync(string hubId)
        {
            Credentials credentials = await Credentials.FromSessionAsync(base.Request.Cookies, Response.Cookies);

            // the API SDK
            ProjectsApi projectsApi = new ProjectsApi();
            projectsApi.Configuration.AccessToken = credentials.TokenInternal;
            var projectsDM = await projectsApi.GetHubProjectsAsync(hubId);

            // 2-legged account:read token
            TwoLeggedApi oauth = new TwoLeggedApi();
            dynamic bearer = await oauth.AuthenticateAsync(Credentials.GetAppSetting("FORGE_CLIENT_ID"), Credentials.GetAppSetting("FORGE_CLIENT_SECRET"), "client_credentials", new Scope[] { Scope.AccountRead });

            // get all projects
            RestClient client = new RestClient(BASE_URL);
            RestRequest projectsRequest = new RestRequest("/hq/v1/accounts/{account_id}/projects?limit=100", RestSharp.Method.GET);
            projectsRequest.AddParameter("account_id", hubId.Replace("b.", string.Empty), ParameterType.UrlSegment);
            projectsRequest.AddHeader("Authorization", "Bearer " + bearer.access_token);
            IRestResponse projectsResponse = await client.ExecuteTaskAsync(projectsRequest);
            dynamic projectsHQ = JArray.Parse(projectsResponse.Content);

            // get business units
            RestRequest bizUnitsRequest = new RestRequest("/hq/v1/accounts/{account_id}/business_units_structure", RestSharp.Method.GET);
            bizUnitsRequest.AddParameter("account_id", hubId.Replace("b.", string.Empty), ParameterType.UrlSegment);
            bizUnitsRequest.AddHeader("Authorization", "Bearer " + bearer.access_token);
            IRestResponse bizUnitsResponse = await client.ExecuteTaskAsync(bizUnitsRequest);
            dynamic bizUnits = JObject.Parse(bizUnitsResponse.Content);

            foreach (dynamic projectHQ in projectsHQ)
            {
                foreach (dynamic bizUnit in bizUnits.business_units)
                {
                    if (projectHQ.business_unit_id == bizUnit.id)
                    {
                        projectHQ.business_unit = bizUnit;
                    }
                }
            }


            dynamic projectsFullData = new JArray();
            foreach (KeyValuePair<string, dynamic> projectDM in new DynamicDictionaryItems(projectsDM.data))
            {
                foreach (dynamic projectHQ in projectsHQ)
                {
                    if (projectHQ.id == projectDM.Value.id.Replace("b.", string.Empty))
                    {
                        dynamic project = JObject.Parse(projectDM.Value.ToString());
                        project.HQData = projectHQ;
                        projectsFullData.Add(project);
                        break;
                    }
                }
            }

            return projectsFullData;
        }

        [HttpPost]
        [Route("api/forge/bim360/accounts/{hubId}/projects")]
        public async Task<JObject> CreateProjectAsync(string hubId, [FromBody]JObject data)
        {
            string accountId = hubId.Replace("b.", string.Empty);

            // 2-legged account:read token
            TwoLeggedApi oauth = new TwoLeggedApi();
            dynamic bearer = await oauth.AuthenticateAsync(Credentials.GetAppSetting("FORGE_CLIENT_ID"), Credentials.GetAppSetting("FORGE_CLIENT_SECRET"), "client_credentials", new Scope[] { Scope.AccountRead, Scope.AccountWrite });

            RestClient client = new RestClient(BASE_URL);
            RestRequest requestCreateProject = new RestRequest("/hq/v1/accounts/{account_id}/projects", RestSharp.Method.POST);
            requestCreateProject.AddParameter("account_id", accountId, ParameterType.UrlSegment);
            requestCreateProject.AddParameter("application/json", Newtonsoft.Json.JsonConvert.SerializeObject(data), ParameterType.RequestBody);
            requestCreateProject.AddHeader("Authorization", "Bearer " + bearer.access_token);

            //IRestResponse response = await client.ExecuteTaskAsync(request);

            return JObject.Parse("{'projectId': '7bdd70f5-f4ea-4a84-aba3-c9cbdb5bd3da'}");
        }

        [HttpPost]
        [Route("api/forge/bim360/accounts/{accountId}/projects/{projectId}/users")]
        public async Task<IActionResult> ImportUsersAsync(string accountId, string projectId, [FromBody]JObject data)
        {
            string roleId = data["roleId"].Value<string>();
            JArray users = data["userIds"].Value<JArray>();

            dynamic usersToAdd = new JArray();
            foreach (dynamic user in users)
            {
                dynamic userToAdd = new JObject();
                userToAdd.user_id = user;
                userToAdd.industry_roles = new JArray();
                userToAdd.industry_roles.Add(roleId);
                userToAdd.services = new JObject();
                userToAdd.services.project_administration = new JObject();
                userToAdd.services.project_administration.access_level = "admin";
                usersToAdd.Add(userToAdd);
            }

            Credentials credentials = await Credentials.FromSessionAsync(base.Request.Cookies, Response.Cookies);

            RestClient client = new RestClient(BASE_URL);
            RestRequest importUserRequest = new RestRequest("/hq/v2/accounts/{account_id}/projects/{project_id}/users/import", RestSharp.Method.POST);
            importUserRequest.AddParameter("account_id", accountId.Replace("b.", string.Empty), ParameterType.UrlSegment);
            importUserRequest.AddParameter("project_id", projectId.Replace("b.", string.Empty), ParameterType.UrlSegment);
            importUserRequest.AddParameter("application/json", Newtonsoft.Json.JsonConvert.SerializeObject(usersToAdd), ParameterType.RequestBody);
            importUserRequest.AddHeader("Authorization", "Bearer " + credentials.TokenInternal);

            IRestResponse importUserResponse = await client.ExecuteTaskAsync(importUserRequest);

            return null;
        }

        [HttpGet]
        [Route("api/forge/bim360/accounts/{accountId}/users")]
        public async Task<JArray> GetAllUsersAsync(string accountId)
        {
            return JArray.Parse((await GetUsersAsync(accountId, Region.US)).Content);
        }

        [HttpGet]
        [Route("api/forge/bim360/accounts/{accountId}/projects/{projectId}/roles")]
        public async Task<JArray> GetRoles(string accountId, string projectId)
        {
            Credentials credentials = await Credentials.FromSessionAsync(base.Request.Cookies, Response.Cookies);

            RestClient client = new RestClient(BASE_URL);
            RestRequest request = new RestRequest("/hq/v2/accounts/{account_id}/projects/{project_id}/industry_roles", RestSharp.Method.GET); // of type:list (DropDowns)
            request.AddParameter("account_id", accountId.Replace("b.", string.Empty), ParameterType.UrlSegment);
            request.AddParameter("project_id", projectId.Replace("b.", string.Empty), ParameterType.UrlSegment);
            request.AddHeader("Authorization", "Bearer " + credentials.TokenInternal);
            return JArray.Parse((await client.ExecuteTaskAsync(request)).Content);
        }

        public sealed class Region
        {
            public static readonly Region US = new Region("accounts");
            public static readonly Region EU = new Region("regions/eu/accounts");

            private Region(string value)
            {
                Resource = value;
            }

            public string Resource { get; private set; }
        }

        public static async Task<IRestResponse> GetUsersAsync(string accountId, Region region)
        {
            TwoLeggedApi oauth = new TwoLeggedApi();
            dynamic bearer = await oauth.AuthenticateAsync(Credentials.GetAppSetting("FORGE_CLIENT_ID"), Credentials.GetAppSetting("FORGE_CLIENT_SECRET"), "client_credentials", new Scope[] { Scope.AccountRead, Scope.DataRead });

            RestClient client = new RestClient(BASE_URL);
            RestRequest request = new RestRequest("/hq/v1/" + region.Resource + "/{account_id}/users?limit=100", RestSharp.Method.GET);
            request.AddParameter("account_id", accountId.Replace("b.", string.Empty), ParameterType.UrlSegment);
            request.AddHeader("Authorization", "Bearer " + bearer.access_token);
            return await client.ExecuteTaskAsync(request);
        }
    }
}