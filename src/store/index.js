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

            // Default Theme
            selTheme: {
                name: "Defaults",
                colors: {
                    primary: '#1976D2',
                    secondary: '#424242',
                    accent: '#82B1FF',
                    error: '#FF5252',
                    info: '#2196F3',
                    success: '#4CAF50',
                    warning: '#FFC107',
                }
            },
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