import Vue from 'vue'
import VueRouter from 'vue-router'
import vuetify from './plugins/vuetify'

import store from "./store";
import App from './App.vue'
import FlasherPage from './components/FlasherPage.vue'
import WelcomePage from './components/WelcomePage.vue'
import BackupPage from './components/BackupPage.vue'
import SettingsPage from './components/SettingsPage.vue'
import YAMLConfiguration from './components/YAMLConfiguration.vue'

const router = new VueRouter({
  mode: 'history',
  routes: [
      { path: '/welcome',  component: WelcomePage },
      { path: '/flash',    component: FlasherPage },
      { path: '/backup',   component: BackupPage },
      { path: '/config',   component: YAMLConfiguration },
      { path: '/settings', component: SettingsPage },
      { path: '*', redirect: '/welcome' }
  ]
});

Vue.use(VueRouter);
Vue.config.productionTip = false

new Vue({
  store,
  router,
  vuetify,
  render: h => h(App),

  props: {
    source: String,
  },
  
  created () {
    this.$vuetify.theme.dark = store.getters.getOptions.themeSwitch;
  },
}).$mount('#app')