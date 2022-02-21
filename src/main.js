import Vue from 'vue'
import VueRouter from 'vue-router'
import vuetify from './plugins/vuetify'

import store from "./store";
import App from './App.vue'
import FlasherPage from './components/FlasherPage.vue'
import FlashWizard from './components/FlashWizard.vue'
import WelcomePage from './components/WelcomePage.vue'
import SDCardPage from './components/SDCardPage.vue'
import SettingsPage from './components/SettingsPage.vue'
import YAMLConfiguration from './components/YAMLConfiguration.vue'

import StepProgress from 'vue-step-progress';
import 'vue-step-progress/dist/main.css';

const router = new VueRouter({
  mode: 'history',
  routes: [
      { path: '/welcome',  component: WelcomePage },
      { path: '/flash',    component: FlasherPage },
      { path: '/wizard',   component: FlashWizard },
      { path: '/sdcard',   component: SDCardPage },
      { path: '/config',   component: YAMLConfiguration },
      { path: '/settings', component: SettingsPage },
      { path: '*', redirect: '/welcome' }
  ]
});

Vue.use(VueRouter);
Vue.config.productionTip = false
Vue.component('step-progress', StepProgress);

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

  mounted () {
    this.$vuetify.theme.themes.light = store.getters.getOptions.selTheme.colors;
    this.$vuetify.theme.themes.dark = store.getters.getOptions.selTheme.colors;
  }
}).$mount('#app')