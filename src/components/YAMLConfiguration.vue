<template>
  <v-container>
      <!--<br><br>
      Nothing here yet, coming in a future version once YAML support is added.-->
      <v-treeview :items="optiontree"></v-treeview>
  </v-container>
</template>

<script>
// eslint-disable-next-line no-unused-vars
const YAML = require('yaml')

export default {
  name: 'YAMLConfiguration',
  
  data () {
    return {
      optiontree: []
    }
  },

  methods: {
    async updateConfig() {
      var data = YAML.parse(`---
- ModelName: Test1
  RXType: CRSF
  ModelID: '3'
- ModelName: Test2
  RXType: SBUS
  ModelID: '2'
- ModelName: Test6
  RXType: INT.
  ModelID: '14'`);

      var idxct = 1;

      this.optiontree = data.map(function(obj){
          idxct+=1;
          var keys = Object.keys(obj);
          return {
            id: idxct,
            children: keys.map(function(itm) {
              idxct+=1;
              return {id: idxct, name: `${itm}: ${obj[itm]}`}
            }),
            name: obj.ModelName
          };
        });

      console.log(this.optiontree);
    },
  },

  created() {
    this.updateConfig()
  }
}
</script>
