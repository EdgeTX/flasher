<template>
  <v-container>
    <v-row justify="space-around">
      <br><br>
      Nothing here yet, coming in a future version once YAML support is added.
    </v-row>
  </v-container>
</template>

<script>
// eslint-disable-next-line no-unused-vars
const YAML = require('yaml')

export default {
  name: 'YAMLConfiguration',
  
  data () {
      return {
      }
  },

  methods: {
    async updateConfig() {
      
    },
  },

  created() {
    this.updateConfig()
  }
}
</script>
