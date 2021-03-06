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
    projectsTable: {},
    projectID: "",
    project: {},
    events:[]
  }
}

export default new Vuex.Store({
  state: {
    isLoggedIn:false,
    userId: '',
    user: {},
    projectsTable: {},
    projectID: "",
    project: {},
    events:[]
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
          context.dispatch('fetchProjectsTable')
        } else {
          context.dispatch('resetState')
          context.dispatch('fetchProjectsTable')
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
    fetchEvents(context, id) {
      let eventsRef = firebase.fetchEvents(id)
      let events = []
      eventsRef.then(function (querySnapshot) {
        //ここarrayに変換せずともそのまま使う方法ある？
        querySnapshot.forEach(function (doc) {
          events.push(doc.data());
        })
        context.commit('syncEvents', events)
      })
    },
    updateEvent(context, {projectId, eventId, content}){
      firebase.updateEvent(projectId, eventId, content)
      .then(docs => {
        context.dispatch('fetchEvents', projectId)
      })
    },
    fetchProjectsTable(context) {
      firebase.db.collection("projectsTable")
            .orderBy("updated", "desc")
            .get().then(docs => {
              var projectsTable = {};
              docs.forEach(doc => {
                projectsTable[doc.id] = doc.data();
              });
              context.commit("syncProjectsTable", projectsTable)
            })
    },
    updateProject(context, { image, name, overview }) {
      let updatedTime = Date.now()
      if (image) {
        console.log("updateProject: with image")
        let uploadTask = firebase.uploadProjectImage(image)  // storage
        uploadTask.on('state_changed', function (snapshot) {
          // Observe state change events such as progress, pause, and resume
          // Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
        }, function (error) {
          // Handle unsuccessful uploads
        }, function () {
          // Handle successful uploads on complete
          // For instance, get the download URL: https://firebasestorage.googleapis.com/...
          uploadTask.snapshot.ref.getDownloadURL().then(function (imgURL) {
            firebase.updateProject(context.state.projectID, imgURL, name, overview)
              .then((docRef) => {
                context.commit('syncProjectImage', imgURL)
                context.commit('syncProjectName', name)
                context.commit('syncProjectOverview', overview)
              })
            firebase.setProjectInProjectsTable(context.state.projectID, name, null, imgURL, updatedTime)
              .then(docRef => {
                context.dispatch('fetchProjectsTable')
              });
          });
        });
      } else {
        console.log("updateProject: w/o image")
        firebase.updateProject(context.state.projectID, context.state.project.heroImage, name, overview)
          .then((docRef) => {
            context.commit('syncProjectName', name)
            context.commit('syncProjectOverview', overview)
          })
        firebase.setProjectInProjectsTable(context.state.projectID, name, null, context.state.project.heroImage, updatedTime)
        .then(docRef => {
          context.dispatch('fetchProjectsTable')
        });
      };
    },
    updateUserProfile(context, { image, nickname, summery }) {
      //actionの引数は2こなのでオブジェクトにまとめてる
      if (image) {
        let uploadTask = firebase.uploadProfileImage(image)  // storage
        uploadTask.on('state_changed', function (snapshot) {
          // Observe state change events such as progress, pause, and resume
          // Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
        }, function (error) {
          // Handle unsuccessful uploads
        }, function () {
          // Handle successful uploads on complete
          // For instance, get the download URL: https://firebasestorage.googleapis.com/...
          uploadTask.snapshot.ref.getDownloadURL().then(function (imgURL) {
            firebase.updateUserProfile(context.state.userId, imgURL, nickname, summery)
              .then((docRef) => {
                context.commit('syncUserImageURL', imgURL)
                context.commit('syncUserNickname', nickname)
                context.commit('syncUserSummery', summery)
              })
          });
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
      if (!name) {
        name = "What a project name!"
      }
      let createdTime = Date.now()
      firebase.createProject(name, createdTime)
      .then(docRef => {
        firebase.setProjectInProjectsTable(docRef.id, name, null, null, createdTime)
        .then(docRef => {
          context.dispatch('fetchProjectsTable')
        });
    });
    },
    addEvent(context, {projectId, date, content}){
      firebase.addEvent(projectId, date, content)
      .then((docRef) => {
        context.dispatch('fetchEvents', projectId)
      })
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
    syncProjectsTable(state, projectsTable) {
      state.projectsTable = projectsTable;
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
    syncEvents(state, events) {
      state.events = events;
    },
  }
});