/*
 * Copyright 2016 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var data = {
  "scenes": [
    {
      "id": "oriente-station",
      "name": "东方车站",
      "levels": [
        {
          "tileSize": 256,
          "size": 256,
          "fallbackOnly": true
        },
        {
          "tileSize": 512,
          "size": 512
        },
        {
          "tileSize": 512,
          "size": 1024
        },
        {
          "tileSize": 512,
          "size": 2048
        },
        {
          "tileSize": 512,
          "size": 4096
        }
      ],
      "faceSize": 4096,
      "initialViewParameters": {
        "pitch": 0,
        "yaw": 0,
        "fov": 1.5707963267948966
      },
      "linkHotspots": [
        {
          "yaw": 3.12678386676067,
          "pitch": -0.0076340532339251865,
          "rotation": 0,
          "target": "electricity-museum"
        }
      ],
      "infoHotspots": [
        {
          "yaw": -0.00038049728702915786,
          "pitch": 0.014985751462495145,
          "title": "东方车站",
          "text": "东方车站是该市最重要的巴士和火车站之一。由西班牙建筑师圣地亚哥·卡拉特拉瓦设计，拥有巨大的金属骨架，覆盖了八条铁路线及其站台。于1998年完工，服务于98世博会，后来服务于万国公园地区。周边有公司、服务机构、酒店、酒吧、娱乐场所以及著名的达伽马购物中心。"
        }
      ]
    },
    {
      "id": "electricity-museum",
      "name": "电力博物馆",
      "levels": [
        {
          "tileSize": 256,
          "size": 256,
          "fallbackOnly": true
        },
        {
          "tileSize": 512,
          "size": 512
        },
        {
          "tileSize": 512,
          "size": 1024
        },
        {
          "tileSize": 512,
          "size": 2048
        },
        {
          "tileSize": 512,
          "size": 4096
        }
      ],
      "faceSize": 4096,
      "initialViewParameters": {
        "pitch": 0,
        "yaw": 0,
        "fov": 1.5707963267948966
      },
      "linkHotspots": [
        {
          "yaw": -2.3152585099587224,
          "pitch": 0.045251205931975846,
          "rotation": 5.497787143782138,
          "target": "jeronimos"
        }
      ],
      "infoHotspots": [
        {
          "yaw": -0.1606464893205768,
          "pitch": -0.17433292221669205,
          "title": "锅炉房",
          "text": "在电力博物馆令人印象深刻的锅炉房里，我们发现了四个约100英尺高的大型锅炉，配有各自的控制面板、空气和燃料回路、通风机等。15号锅炉已被博物馆化，游客可以进入内部探索其结构和内部组件：传送带、贝利墙、石脑油燃烧器、水加热管等。"
        }
      ]
    },
    {
      "id": "jeronimos",
      "name": "热罗尼莫斯修道院",
      "levels": [
        {
          "tileSize": 256,
          "size": 256,
          "fallbackOnly": true
        },
        {
          "tileSize": 512,
          "size": 512
        },
        {
          "tileSize": 512,
          "size": 1024
        },
        {
          "tileSize": 512,
          "size": 2048
        },
        {
          "tileSize": 512,
          "size": 4096
        }
      ],
      "faceSize": 4096,
      "initialViewParameters": {
        "pitch": 0,
        "yaw": 0,
        "fov": 1.5707963267948966
      },
      "linkHotspots": [
        {
          "yaw": -0.775981148319735,
          "pitch": 0.2661802812323746,
          "rotation": 0,
          "target": "oriente-station"
        }
      ],
      "infoHotspots": [
        {
          "yaw": 0.5350080558065997,
          "pitch": 0.24525106321929435,
          "title": "热罗尼莫斯修道院",
          "text": "热罗尼莫斯修道院回廊是一个宜人而宁静的地方，旨在促进僧侣的祈祷和冥想。其曼努埃尔风格装饰具有宗教、航海和皇室元素，以及植物图案。自1985年以来，诗人费尔南多·佩索阿的墓一直位于回廊底层的北翼。"
        }
      ]
    }
  ],
  "name": "全景漫游示例",
  "settings": {
    "mouseViewMode": "drag",
    "autorotateEnabled": true,
    "fullscreenButton": true,
    "viewControlButtons": true
  }
};
