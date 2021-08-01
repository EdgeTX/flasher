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
        }
    },
    getters: {
        getOptions: (state) => {
            return state.options
        }
    },
    mutations: {
        update(state, userData) {
            state.options = userData;
        }
    },
    actions: {},
    plugins: [createPersistedState()]
});