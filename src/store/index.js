import Vue from "vue";
import Vuex from "vuex";

import createPersistedState from "vuex-persistedstate";
 
Vue.use(Vuex);
 
export default new Vuex.Store({
    state: {
        options: {
            // Flasher Settings
            advancedFlash: false,

            // Backup Settings
            defaultDir: "",

            // Global App Settings
            themeSwitch: true,
        },

        // Logging cache
        globalLog: []
    },
    getters: {
        getOptions: (state) => {
            return state.options
        },

        getLog: (state) => {
            return state.globalLog
        },

        getFormattedLog: (state) => {
            var formatted = "";
            state.globalLog.forEach(function(item) {
                formatted += `[${item.type}][${item.date}] ${item.msg}\n`
            });

            return formatted;
        },
    },
    mutations: {
        update(state, userData) {
            state.options = userData;
        },

        updateAll(state, userData) {
            state = userData;
        },

        addLog(state, userData) {
            userData.date = new Date().toISOString();
            console.log(`[${userData.type}][${userData.date}] ${userData.msg}`);
            
            state.globalLog.push(userData);
        },

        setLog(state, userData) {
            state.globalLog = userData;
        }
    },
    actions: {},
    plugins: [createPersistedState()]
});