import Vue from 'vue';
import Vuex from 'vuex';
import firebase from './firebase';
import realfirebase from 'firebase';
Vue.use(Vuex);

function initialState () {
  return {
    isLoggedIn:false,
    userId: '',
    user: {},
    projects: {},
    projectID: "",
    project: {}
  }
}

export default new Vuex.Store({
  state: {
    isLoggedIn:false,
    userId: '',
    user: {},
    projects: {},
    projectID: "",
    project: {}
  },
  actions: {
    init(context) {
      realfirebase.auth().onAuthStateChanged(user => {
        if(user){
          context.commit('storeUserId', user.uid);
          context.commit('storeIsLoggedIn', true);
          firebase.db.collection("users")
            .doc(user.uid)
            .get().then(doc => {
              context.commit('syncUser', doc.data());
            })
          context.dispatch('fetchProjects')
        } else {
          context.dispatch('resetState')
        }
        
      });
    },
    resetState(context){
      context.commit("resetState");
    },
    fetchProject(context, id) {
      let projectRef = firebase.fetchProject(id)
      projectRef.then(doc => {
        context.commit('syncProjectID', id)
        context.commit('syncProject', doc.data())
      })
    },
    fetchProjects(context) {
      firebase.db.collection("projectsTable")
            .get().then(docs => {
              var projects = {};
              docs.forEach(doc => {
                projects[doc.id] = doc.data();
              });
              context.commit("syncProjects", projects)
            })
    },
    updateProject(context, { image, name, overview }) {
      if (image) {
        let uploadRef = firebase.uploadProjectImage(image)  // storage
        uploadRef.then(function (imgURL) {
          firebase.updateProject(context.state.projectID, imgURL, name, overview)
            .then((docRef) => {
              context.commit('syncProjectImage', imgURL)
              context.commit('syncProjectName', name)
              context.commit('syncProjectOverview', overview)
            })
        });
      } else {
        firebase.updateProject(context.state.projectID, context.state.project.heroImage, name, overview)
          .then((docRef) => {
            context.commit('syncProjectName', name)
            context.commit('syncProjectOverview', overview)
          })
      };
      firebase.addProjectInProjectsTable(context.state.projectID, name)
    },
    updateUserProfile(context, { image, nickname, summery }) {
      //actionの引数は2こなのでオブジェクトにまとめてる
      if (image) {
        let uploadRef = firebase.uploadProfileImage(image)  // storage
        uploadRef.then(function (imgURL) {
          firebase.updateUserProfile(context.state.userId, imgURL, nickname, summery)
            .then((docRef) => {
              context.commit('syncUserImageURL', imgURL)
              context.commit('syncUserNickname', nickname)
              context.commit('syncUserSummery', summery)
            })
        });
      } else {
        firebase.updateUserProfile(context.state.userId, context.state.user.image, nickname, summery)
          .then((docRef) => {
            context.commit('syncUserNickname', nickname)
            context.commit('syncUserSummery', summery)
          })
      }
    },
    createProject(context, name) {
      firebase.createProject(name)
      .then(docRef => {
        firebase.addProjectInProjectsTable(docRef.id, name)
        .then(docRef => {
          context.dispatch('fetchProjects')
        });
    });
    }
  },
  mutations: {
    resetState(state) {
      // acquire initial state
      const s = initialState()
      Object.keys(s).forEach(key => {
        state[key] = s[key]
      })
    },
    storeIsLoggedIn(state, isLoggedIn){
      state.isLoggedIn = isLoggedIn
    },
    storeUserId(state, userId) {
      state.userId = userId;
    },
    syncUser(state, user) {
      state.user = user;
    },
    syncUserImageURL(state, url) {
      console.log("syncing new url", url)
      state.user.image = url;
    },
    syncUserNickname(state, nickname) {
      state.user.nickname = nickname;
    },
    syncUserSummery(state, summery) {
      state.user.summery = summery;
    },
    syncProjects(state, projects) {
      state.projects = projects;
    },
    syncProject(state, project) {
      state.project = project;
    },
    syncProjectID(state, projectID) {
      state.projectID = projectID;
    },
    syncProjectImage(state, image) {
      state.project.image = image;
    },
    syncProjectName(state, name) {
      state.project.name = name;
    },
    syncProjectOverview(state, overview) {
      state.project.overview = overview;
    },
  }
});