import React from 'react';
import PropTypes from 'prop-types'
import {EntityByGuidQuery, Spinner, Tabs, TabsItem,
  UserStorageMutation, UserStorageQuery, 
  EntityStorageMutation, EntityStorageQuery, 
  AccountStorageMutation, AccountStorageQuery} from 'nr1'

import Github from './github'
import Setup from './setup'
import RepoPicker from './repo-picker'
import Readme from './readme'
import Contributors from './contributors'

const GITHUB_URL="https://source.datanerd.us"

export default class GithubAbout extends React.Component {
    static propTypes = {
      nerdletUrlState: PropTypes.object,
      launcherUrlState: PropTypes.object,
    }

    constructor(props) {
      super(props)

      this._setUserToken = this._setUserToken.bind(this)
      this._setRepo = this._setRepo.bind(this)
      this._setGithub = this._setGithub.bind(this)

      this.state = {}
    }

    async _setUserToken(userToken) {
      const {githubUrl} = this.state
      const mutation = {actionType: UserStorageMutation.ACTION_TYPE.WRITE_DOCUMENT, 
        collection: "global", 
        documentId: "userToken", 
        document: userToken}
      await UserStorageMutation.mutate(mutation)

      const github = userToken && githubUrl && new Github(userToken, githubUrl)
      this.setState({github})
    }
    
    async _setGithub(githubUrl) { 
      const {entity, userToken} = this.state

      // strip out everything after hostname including the first "/"
      githubUrl = githubUrl.match(/https:\/\/[^\/]*/)[0]

      const mutation = {actionType: AccountStorageMutation.ACTION_TYPE.WRITE_DOCUMENT, 
        collection: "global", 
        accountId: entity.accountId, 
        documentId: "githubUrl", 
        document: githubUrl}
      
      await AccountStorageMutation.mutate(mutation)      
      
      const github = userToken && new Github(userToken, githubUrl)
      this.setState({githubUrl})
    }

    async _setRepo(repoUrl) { 
      const {entity} = this.state

      console.log("SetRepo", repoUrl)

      const mutation = {actionType: EntityStorageMutation.ACTION_TYPE.WRITE_DOCUMENT, 
        collection: "global", 
        entityGuid: entity.guid, 
        documentId: "repoUrl", 
        document: repoUrl}
      
      const result = await EntityStorageMutation.mutate(mutation)      
      console.log("write repo URL", result)
      this.setState({repoUrl})
    }

    async componentDidMount() {
      const {entityGuid} = this.props.nerdletUrlState
      const {data} = await EntityByGuidQuery.query({entityGuid})
      const entity = data.actor.entities[0]

      let result = await UserStorageQuery.query({collection: "global", documentId: "userToken"})
      const userToken = result.data.actor.nerdStorage.document
      result = await AccountStorageQuery.query({accountId: entity.accountId, collection: "global", documentId: "githubUrl"})
      const githubUrl = result.data.actor.account.nerdStorage.document
      result = await EntityStorageQuery.query({entityGuid, collection: "global", documentId: "repoUrl"})
      const repoUrl = result.data.actor.entity.nerdStorage.document
      const github = userToken && githubUrl && new Github(userToken, githubUrl)

      this.setState({entity, github, githubUrl, repoUrl, userToken})
    }

    renderTabs() {
      const {repoUrl} = this.state
      var path, owner, project
      try {
        const url = new URL(repoUrl)
        path = url.pathname.slice(1)
        const split = path.split('/')
        owner = split[0]
        project = split[1]
      }
      catch (e) {
        // eslint-disable-next-line
        console.error("Error parsing repository URL", repository, e)
      }
    
      return <>
      <h2>
      <img width="36px" height="36px"
            src="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png" />
        Github</h2>
      <a href={repoUrl} target="_blank">{repoUrl}</a>
      <Tabs>
        <TabsItem itemKey = "readme" label="Readme">
          <Readme {...this.state} owner={owner} project={project}/>
        </TabsItem>
        <TabsItem itemKey = "contributors" label="Contributors">
          <Contributors {...this.state} owner={owner} project={project}/>
        </TabsItem>
        <TabsItem itemKey = "repository" label="Repository">
          <RepoPicker {...this.state} setRepo={this._setRepo} setUserToken={this._setUserToken}/>
        </TabsItem>
        <TabsItem itemKey = "setup" label="Setup">
          <Setup {...this.state} setUserToken={this._setUserToken} setGithub={this._setGithub}/>
        </TabsItem>
      </Tabs>
      </>
      
    }

    render() {
      const {entity, github, githubUrl, repoUrl} = this.state
      if(!entity) return <Spinner/>
      if(!githubUrl || !github) return <Setup {...this.state}
            setUserToken={this._setUserToken} setGithub={this._setGithub}/>
            
      if(repoUrl) return this.renderTabs()            
      return <RepoPicker {...this.state} setRepo={this._setRepo} setUserToken={this._setUserToken}/>
    }
}
