<template>
  <v-container>
    <v-row justify="space-around">
      <br><br>
      Nothing here yet, coming in a future version.
    </v-row>
  </v-container>
</template>

<script>

// dfu-util.exe -a 0 --dfuse-address 0x08000000:524288 --device 0483:df11  -U<path here>

export default {
  name: 'BackupPage',
  
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
