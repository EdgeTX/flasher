<template> 
    <v-app>
      <v-navigation-drawer
        v-model="drawer"
        app
        clipped
        permanent
      >
        <v-list dense>
          <v-list-item link to="/flash">
            <v-list-item-action>
              <v-icon>mdi-code-array</v-icon>
            </v-list-item-action>
            <v-list-item-content>
              <v-list-item-title>Flash</v-list-item-title>
            </v-list-item-content>
          </v-list-item>

          <v-list-item link to="/backup">
            <v-list-item-action>
              <v-icon>mdi-database-arrow-right</v-icon>
            </v-list-item-action>
            <v-list-item-content>
              <v-list-item-title>Backup</v-list-item-title>
            </v-list-item-content>
          </v-list-item>

          <v-list-item link to="/settings">
            <v-list-item-action>
              <v-icon>mdi-cog</v-icon>
            </v-list-item-action>
            <v-list-item-content>
              <v-list-item-title>Settings</v-list-item-title>
            </v-list-item-content>
          </v-list-item>
        </v-list>
      </v-navigation-drawer>
  
      <v-app-bar
        app
        clipped-left
      >
        <v-toolbar-title>EdgeTX Flasher</v-toolbar-title>
      </v-app-bar>
  
      <v-main> 
          <router-view></router-view>
      </v-main>
  
      <v-footer app>
        <span>&copy; {{ new Date().getFullYear() }} EdgeTX Team</span>
      </v-footer>
    </v-app>
</template>

<script>
export default {
  name: 'EdgeTX Flasher',

  components: {
  },

  data: () => ({
    //
  }),
};
</script>
