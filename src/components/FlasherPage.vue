<template>
  <v-container>

      <v-container>
        <div>
          <v-sheet elevation="6" class="rounded-lg">
            <v-tabs class="rounded">
              <v-tabs-slider color="blue"></v-tabs-slider>

              <v-tab
                v-for="tr in targets"
                :key="tr"
                :href="'#tab-' + tr"
              >
                {{ tr }}
              </v-tab>
              
            </v-tabs>
          </v-sheet>

          <br>

          <v-select
            :items="fwversions"
            label="Firmware Version"
            class="rounded"
            solo
          ></v-select>
          <v-list class="rounded">
            <v-list-item 
                v-for="item in fwflags"                           
                :key="item.id"
             >
              <v-row class="ml-1">
                <v-checkbox 
                  v-model="model"             
                  :label="item.name + '    -    ' + item.description"  
                  :value="item.name" 
                  :value-comparator="comparator"
                  class="shrink mr-2"
                ></v-checkbox>
              </v-row>
            </v-list-item>
          </v-list>
          <br><br><br>

          <v-btn
              color="primary"
              block
              elevation="2"
              large
          >Write</v-btn>
        </div>
      </v-container>

  </v-container>
</template>

<script>
const https = require('https')

var targets = [
  "TX16s",
  "QX7",
  "X9D Plus",
  "T-Lite"
];

const options = {
  hostname: 'edgetx-targets.surge.sh',
  port: 443,
  path: '/targets.json',
  method: 'GET',
  json: true
}

export default {
  name: 'FlasherPage',
  
  data () {
      return {
        targets,
        fwversions: [],
        fwflags: [],
        model: [],
      }
  },

  methods: {
    comparator(a, b) {
      console.log(a, b);
      return a.id == b.id;
    },

    fetchReleases(){
      var self = this;

      const req = https.request(options, res => {
        console.log(`statusCode: ${res.statusCode}`)

        res.on('data', d => {
          var curr_release = JSON.parse(d);
          console.log(curr_release[0].options);
          self.fwflags = curr_release[0].options;
        })
      })

      req.on('error', error => {
        console.error(error)
      })

      req.end()
    }
  },

  created() {
    this.fetchReleases()
  }
}

</script>
