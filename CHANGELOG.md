# Changelog

## [2.4.0](https://github.com/gpulga/ableton-dj-mcp/compare/ableton-dj-mcp-v2.3.0...ableton-dj-mcp-v2.4.0) (2026-09-23)


### Features

* attach install zip and Claude Desktop extension to releases ([#318](https://github.com/gpulga/ableton-dj-mcp/issues/318)) ([618a10e](https://github.com/gpulga/ableton-dj-mcp/commit/618a10e948de12fcf90dfcbe068d1164ed0b5f56))


### Dependencies

* bump @types/node from 26.1.2 to 26.2.0 ([#301](https://github.com/gpulga/ableton-dj-mcp/issues/301)) ([17eca4c](https://github.com/gpulga/ableton-dj-mcp/commit/17eca4cce50f97a25da5aaa5a893e8df249274ed))
* bump @typescript-eslint/eslint-plugin from 8.66.0 to 8.67.0 ([#303](https://github.com/gpulga/ableton-dj-mcp/issues/303)) ([ce1b4bf](https://github.com/gpulga/ableton-dj-mcp/commit/ce1b4bfab3fe0b767cdc6d9e64b3f2e8a777ba7d))
* bump @typescript-eslint/parser from 8.66.0 to 8.67.0 ([#302](https://github.com/gpulga/ableton-dj-mcp/issues/302)) ([40ea3d0](https://github.com/gpulga/ableton-dj-mcp/commit/40ea3d0203fe1c066a7b24185ad2b0897edcc404))
* bump @vitest/coverage-v8 from 4.1.10 to 4.1.11 ([#308](https://github.com/gpulga/ableton-dj-mcp/issues/308)) ([dc3a140](https://github.com/gpulga/ableton-dj-mcp/commit/dc3a1403cc631cc4722ac8f8ff9004572f8c2c02))
* bump @vitest/eslint-plugin from 1.6.26 to 1.6.27 ([#300](https://github.com/gpulga/ableton-dj-mcp/issues/300)) ([c7498bc](https://github.com/gpulga/ableton-dj-mcp/commit/c7498bc52cab9070603360b201c7dd2ed0bcbf70))
* bump eslint-plugin-jsdoc from 63.3.3 to 64.2.1 ([#309](https://github.com/gpulga/ableton-dj-mcp/issues/309)) ([839b189](https://github.com/gpulga/ableton-dj-mcp/commit/839b1898a31c927703967915300df607f60b9d22))
* bump jscpd from 5.0.14 to 5.0.15 ([#304](https://github.com/gpulga/ableton-dj-mcp/issues/304)) ([a7fd613](https://github.com/gpulga/ableton-dj-mcp/commit/a7fd61346b6f509e9423b5cb4789feb5d228e997))
* bump jscpd from 5.0.15 to 5.3.0 ([#305](https://github.com/gpulga/ableton-dj-mcp/issues/305)) ([5612181](https://github.com/gpulga/ableton-dj-mcp/commit/5612181832d02c593b225105b40bdfc77504cf53))
* bump rollup from 4.62.4 to 4.63.4 ([#306](https://github.com/gpulga/ableton-dj-mcp/issues/306)) ([0a8f86b](https://github.com/gpulga/ableton-dj-mcp/commit/0a8f86b5f0af969a88c48ed78c0e0654054644df))
* bump vitest from 4.1.10 to 4.1.11 ([#307](https://github.com/gpulga/ableton-dj-mcp/issues/307)) ([0b52cc1](https://github.com/gpulga/ableton-dj-mcp/commit/0b52cc1c9ecce15f25e79138f177ba05470f4d0b))

## [2.3.0](https://github.com/gabrielpulga/ableton-dj-mcp/compare/ableton-dj-mcp-v2.2.0...ableton-dj-mcp-v2.3.0) (2026-08-08)


### Features

* add live output meter levels to adj-read-track ([#295](https://github.com/gabrielpulga/ableton-dj-mcp/issues/295)) ([b0a0fa2](https://github.com/gabrielpulga/ableton-dj-mcp/commit/b0a0fa2ecf4668e8e70830d1b5f7685ef1d1ac11))
* expose Compressor sidechain input routing ([#268](https://github.com/gabrielpulga/ableton-dj-mcp/issues/268), [#93](https://github.com/gabrielpulga/ableton-dj-mcp/issues/93)) ([#288](https://github.com/gabrielpulga/ableton-dj-mcp/issues/288)) ([88cc2c6](https://github.com/gabrielpulga/ableton-dj-mcp/commit/88cc2c65fb192a31c254f1f40cb8b0ecafd5da6a))


### Bug Fixes

* await updateClip in duplicate's arrangementLength tiling path ([#279](https://github.com/gabrielpulga/ableton-dj-mcp/issues/279)) ([#287](https://github.com/gabrielpulga/ableton-dj-mcp/issues/287)) ([6cca800](https://github.com/gabrielpulga/ableton-dj-mcp/commit/6cca800ebdf7de72772a7b61c708904778a1707c))
* bound adj-browse reply size to fit one UDP datagram ([#290](https://github.com/gabrielpulga/ableton-dj-mcp/issues/290)) ([f090b80](https://github.com/gabrielpulga/ableton-dj-mcp/commit/f090b800b5381ef820e65d186e630c2b7028452f))
* dispatch CI explicitly so bot-authored PRs aren't blocked forever ([#296](https://github.com/gabrielpulga/ableton-dj-mcp/issues/296)) ([9cdb644](https://github.com/gabrielpulga/ableton-dj-mcp/commit/9cdb6442cbcaa4234ab215957454d94a144ccd98))
* restore CI by reverting typescript and @eslint/js bumps ([#281](https://github.com/gabrielpulga/ableton-dj-mcp/issues/281)) ([d19b18d](https://github.com/gabrielpulga/ableton-dj-mcp/commit/d19b18dceb6dc5f4777df50b656c67e1674c8769))
* skip source clip in arrangement-clip overlap clearing ([#264](https://github.com/gabrielpulga/ableton-dj-mcp/issues/264)) ([#280](https://github.com/gabrielpulga/ableton-dj-mcp/issues/280)) ([e671f27](https://github.com/gabrielpulga/ableton-dj-mcp/commit/e671f279c6fc60ff0b82b89ebb878bad0014993f))
* surface a REPLY_TOO_LARGE/SEND_FAILED error instead of silently dropping ([#293](https://github.com/gabrielpulga/ableton-dj-mcp/issues/293)) ([c9d1471](https://github.com/gabrielpulga/ableton-dj-mcp/commit/c9d14711eee04db69b1c22e59d4579a92007b474))


### Dependencies

* bump @eslint/js from 9.39.5 to 10.0.1 ([#278](https://github.com/gabrielpulga/ableton-dj-mcp/issues/278)) ([a07128b](https://github.com/gabrielpulga/ableton-dj-mcp/commit/a07128b71a8a84a7cc03765568b971262f1fed9a))
* bump @typescript-eslint/eslint-plugin from 8.65.0 to 8.66.0 ([#284](https://github.com/gabrielpulga/ableton-dj-mcp/issues/284)) ([84dd25b](https://github.com/gabrielpulga/ableton-dj-mcp/commit/84dd25b358ee9d73ea586959dd74d4ecc787bf9a))
* bump @vitest/eslint-plugin from 1.6.24 to 1.6.26 ([#286](https://github.com/gabrielpulga/ableton-dj-mcp/issues/286)) ([f824dca](https://github.com/gabrielpulga/ableton-dj-mcp/commit/f824dca2d21c29c38c247e4540ddbfffdd3bb6dd))
* bump eslint-plugin-jsdoc from 63.3.2 to 63.3.3 ([#283](https://github.com/gabrielpulga/ableton-dj-mcp/issues/283)) ([17d1f97](https://github.com/gabrielpulga/ableton-dj-mcp/commit/17d1f970c4e2885a4a1f7aa8c31acec7b0e53d4e))
* bump rollup from 4.62.3 to 4.62.4 ([#277](https://github.com/gabrielpulga/ableton-dj-mcp/issues/277)) ([1ef16ce](https://github.com/gabrielpulga/ableton-dj-mcp/commit/1ef16ce303903c3669c3758c50f6bec92033bdc3))
* bump typescript from 6.0.3 to 7.0.2 ([#276](https://github.com/gabrielpulga/ableton-dj-mcp/issues/276)) ([ffe2e65](https://github.com/gabrielpulga/ableton-dj-mcp/commit/ffe2e65bab696a09bdcc565554e94749d8645e3f))

## [2.2.0](https://github.com/gabrielpulga/ableton-dj-mcp/compare/ableton-dj-mcp-v2.1.0...ableton-dj-mcp-v2.2.0) (2026-08-04)


### Features

* session-validated automation findings + humanize skills rules ([#263](https://github.com/gabrielpulga/ableton-dj-mcp/issues/263)) ([f89d52a](https://github.com/gabrielpulga/ableton-dj-mcp/commit/f89d52a8b173317e76c961e6a190dd505a0afeda))


### Bug Fixes

* restore CI by reverting to the last working eslint pairing ([#274](https://github.com/gabrielpulga/ableton-dj-mcp/issues/274)) ([2d1e2c5](https://github.com/gabrielpulga/ableton-dj-mcp/commit/2d1e2c509ebbb46c770fed22f33683c2eac85220))
* warn and clamp instead of silently dropping out-of-range param writes ([#271](https://github.com/gabrielpulga/ableton-dj-mcp/issues/271)) ([af8b50b](https://github.com/gabrielpulga/ableton-dj-mcp/commit/af8b50b3d7050c21fa8ffc89eca5faf65f467e00)), closes [#269](https://github.com/gabrielpulga/ableton-dj-mcp/issues/269)


### Dependencies

* bump @modelcontextprotocol/sdk from 1.29.0 to 1.30.0 ([#261](https://github.com/gabrielpulga/ableton-dj-mcp/issues/261)) ([8ce2ec6](https://github.com/gabrielpulga/ableton-dj-mcp/commit/8ce2ec6c9331080eccd0ce0e8281fcdb32098f99))
* bump @types/node from 26.1.1 to 26.1.2 ([#257](https://github.com/gabrielpulga/ableton-dj-mcp/issues/257)) ([a203061](https://github.com/gabrielpulga/ableton-dj-mcp/commit/a2030616c111ab002e584d9c16ed167984296ad6))
* bump eslint from 9.39.5 to 10.8.0 ([#258](https://github.com/gabrielpulga/ableton-dj-mcp/issues/258)) ([bd96aba](https://github.com/gabrielpulga/ableton-dj-mcp/commit/bd96aba412c38197a3559a2e53305be094401cbd))
* bump eslint-plugin-jsdoc from 63.3.0 to 63.3.2 ([#262](https://github.com/gabrielpulga/ableton-dj-mcp/issues/262)) ([64e7cc5](https://github.com/gabrielpulga/ableton-dj-mcp/commit/64e7cc5e479e84043a0170b0da35dc0e9a1943bd))
* bump eslint-plugin-unicorn from 65.0.1 to 72.0.0 ([#259](https://github.com/gabrielpulga/ableton-dj-mcp/issues/259)) ([26c76b3](https://github.com/gabrielpulga/ableton-dj-mcp/commit/26c76b313fb42d73ca430017e5993e3f5057b037))
* bump jscpd from 5.0.12 to 5.0.14 ([#260](https://github.com/gabrielpulga/ableton-dj-mcp/issues/260)) ([c74dbbf](https://github.com/gabrielpulga/ableton-dj-mcp/commit/c74dbbffb7a53ec0dd5b994f21f70cd9d80019a9))

## [2.1.0](https://github.com/gabrielpulga/ableton-dj-mcp/compare/ableton-dj-mcp-v2.0.0...ableton-dj-mcp-v2.1.0) (2026-08-03)


### Features

* add adj-automate clip automation envelope tool ([#255](https://github.com/gabrielpulga/ableton-dj-mcp/issues/255)) ([6a17173](https://github.com/gabrielpulga/ableton-dj-mcp/commit/6a1717351b50e699b8a76c806f54f889ecf51b4b))

## [2.0.0](https://github.com/gabrielpulga/ableton-dj-mcp/compare/ableton-dj-mcp-v1.13.0...ableton-dj-mcp-v2.0.0) (2026-08-02)


### ⚠ BREAKING CHANGES

* adj-update-track no longer accepts freeze/flatten params or returns isFrozen/freezeStatus/flattened fields on write. Read-only isFrozen on adj-read-track is unaffected.

### Bug Fixes

* correct Live API property/arg mismatches found in live validation ([#251](https://github.com/gabrielpulga/ableton-dj-mcp/issues/251)) ([3b7f870](https://github.com/gabrielpulga/ableton-dj-mcp/commit/3b7f87064462443eefcbde928de7413e1c3c257d))
* remove dead Open Chat UI button, point Docs button at Tools-Reference ([#250](https://github.com/gabrielpulga/ableton-dj-mcp/issues/250)) ([1a8cf58](https://github.com/gabrielpulga/ableton-dj-mcp/commit/1a8cf588bdbd2cc9345289799c7350c44acadb4b))
* remove track freeze/flatten, fix v8 sleep Task GC hang ([#254](https://github.com/gabrielpulga/ableton-dj-mcp/issues/254)) ([18b2a04](https://github.com/gabrielpulga/ableton-dj-mcp/commit/18b2a04879d1ea65289ef478d996539b1749a292))

## [1.13.0](https://github.com/gabrielpulga/ableton-dj-mcp/compare/ableton-dj-mcp-v1.12.0...ableton-dj-mcp-v1.13.0) (2026-08-02)


### Features

* expose track freeze and flatten ([#241](https://github.com/gabrielpulga/ableton-dj-mcp/issues/241)) ([7811c1e](https://github.com/gabrielpulga/ableton-dj-mcp/commit/7811c1eca3a6e1394e88c0024a52199f086d1bd6)), closes [#30](https://github.com/gabrielpulga/ableton-dj-mcp/issues/30)

## [1.12.0](https://github.com/gabrielpulga/ableton-dj-mcp/compare/ableton-dj-mcp-v1.11.0...ableton-dj-mcp-v1.12.0) (2026-08-02)


### Features

* **adj-microsection-mute:** wrap velocity-by-bar transforms for 4-microsection arc ([#126](https://github.com/gabrielpulga/ableton-dj-mcp/issues/126)) ([345ce12](https://github.com/gabrielpulga/ableton-dj-mcp/commit/345ce1246bee44a3e53b6b020faced84dc77036f))
* expose Ableton Link controls and tempo nudge ([#237](https://github.com/gabrielpulga/ableton-dj-mcp/issues/237)) ([52dd10f](https://github.com/gabrielpulga/ableton-dj-mcp/commit/52dd10f9e4015220efa11a83751db3beba397443)), closes [#31](https://github.com/gabrielpulga/ableton-dj-mcp/issues/31)
* expose global groove amount get/set ([#236](https://github.com/gabrielpulga/ableton-dj-mcp/issues/236)) ([ec34864](https://github.com/gabrielpulga/ableton-dj-mcp/commit/ec34864e3ed06b659745328b69928b4918070bc1)), closes [#27](https://github.com/gabrielpulga/ableton-dj-mcp/issues/27)
* expose granular clip properties (pitch fine, legato, RAM mode, velocity, duplicate loop) ([#238](https://github.com/gabrielpulga/ableton-dj-mcp/issues/238)) ([0e8ae5b](https://github.com/gabrielpulga/ableton-dj-mcp/commit/0e8ae5baa612499d2f6545a67f1d7193a9b2743b)), closes [#29](https://github.com/gabrielpulga/ableton-dj-mcp/issues/29)
* expose punch in/out and arrangement overdub mode ([#240](https://github.com/gabrielpulga/ableton-dj-mcp/issues/240)) ([2d21b42](https://github.com/gabrielpulga/ableton-dj-mcp/commit/2d21b429b0db22f6a46aa2eb760fddd62cb37ddb)), closes [#32](https://github.com/gabrielpulga/ableton-dj-mcp/issues/32)
* expose track fold/unfold and group state ([#239](https://github.com/gabrielpulga/ableton-dj-mcp/issues/239)) ([fcee831](https://github.com/gabrielpulga/ableton-dj-mcp/commit/fcee83110b1753306fe5fa9a5c69bba244bfff65)), closes [#33](https://github.com/gabrielpulga/ableton-dj-mcp/issues/33)


### Bug Fixes

* move .prettierignore back to root, breaks ignore patterns from config/ ([#235](https://github.com/gabrielpulga/ableton-dj-mcp/issues/235)) ([fd860dc](https://github.com/gabrielpulga/ableton-dj-mcp/commit/fd860dc508198d931fe42a91484266d2415d2791))
* remove personal taste and identifying content from public repo ([#229](https://github.com/gabrielpulga/ableton-dj-mcp/issues/229)) ([93644a5](https://github.com/gabrielpulga/ableton-dj-mcp/commit/93644a580974b831edfa72cc0ef2231104f44685))
* resolve typescript/eslint peer dependency conflict blocking npm ci ([#230](https://github.com/gabrielpulga/ableton-dj-mcp/issues/230)) ([4e94a60](https://github.com/gabrielpulga/ableton-dj-mcp/commit/4e94a60e10c37efe1568a179e72ac9cce1823c23))
* track Max device sources so fresh clones can install ([#144](https://github.com/gabrielpulga/ableton-dj-mcp/issues/144)) ([efc8559](https://github.com/gabrielpulga/ableton-dj-mcp/commit/efc8559c7800376ee12393d805bae6928cb1fece))


### Dependencies

* bump @eslint-community/eslint-plugin-eslint-comments ([#153](https://github.com/gabrielpulga/ableton-dj-mcp/issues/153)) ([38a43b8](https://github.com/gabrielpulga/ableton-dj-mcp/commit/38a43b81ff24ea597a780280c9feb8f7eabd7e64))
* bump @rollup/plugin-commonjs from 29.0.2 to 29.0.3 ([#156](https://github.com/gabrielpulga/ableton-dj-mcp/issues/156)) ([f1777cb](https://github.com/gabrielpulga/ableton-dj-mcp/commit/f1777cbf5d1f597ebc82279174d6e11d6da9c169))
* bump @types/node from 25.6.0 to 25.6.2 ([#133](https://github.com/gabrielpulga/ableton-dj-mcp/issues/133)) ([2be5cd1](https://github.com/gabrielpulga/ableton-dj-mcp/commit/2be5cd1ba88f82deb73a4c7b83a8bd5151cf53d1))
* bump @types/node from 25.6.2 to 25.8.0 ([#139](https://github.com/gabrielpulga/ableton-dj-mcp/issues/139)) ([6dd290f](https://github.com/gabrielpulga/ableton-dj-mcp/commit/6dd290fa58df914b75907504175ed53462a8f030))
* bump @types/node from 25.8.0 to 25.9.1 ([#152](https://github.com/gabrielpulga/ableton-dj-mcp/issues/152)) ([aedd7cf](https://github.com/gabrielpulga/ableton-dj-mcp/commit/aedd7cf33febf053b0e77776a44197b697bdf825))
* bump @types/node from 25.9.1 to 25.9.2 ([#166](https://github.com/gabrielpulga/ableton-dj-mcp/issues/166)) ([dacd948](https://github.com/gabrielpulga/ableton-dj-mcp/commit/dacd948ee3e01ac02d2ff0ad97b62521d07d47bb))
* bump @types/node from 25.9.2 to 25.9.3 ([#171](https://github.com/gabrielpulga/ableton-dj-mcp/issues/171)) ([64eef0c](https://github.com/gabrielpulga/ableton-dj-mcp/commit/64eef0cbcad9ba32ab0af215791980cc664af668))
* bump @types/node from 25.9.3 to 26.0.1 ([#196](https://github.com/gabrielpulga/ableton-dj-mcp/issues/196)) ([a9a4c73](https://github.com/gabrielpulga/ableton-dj-mcp/commit/a9a4c736a15d4c4c1ffb1ef7ba7dddeb8314ee79))
* bump @types/node from 26.0.1 to 26.1.0 ([#200](https://github.com/gabrielpulga/ableton-dj-mcp/issues/200)) ([45cda52](https://github.com/gabrielpulga/ableton-dj-mcp/commit/45cda52fc7b75e8f27a4cdef7554eff01b8c8c57))
* bump @types/node from 26.1.0 to 26.1.1 ([#204](https://github.com/gabrielpulga/ableton-dj-mcp/issues/204)) ([000ab8c](https://github.com/gabrielpulga/ableton-dj-mcp/commit/000ab8cb352cdee20741a07d491e7362658c02f9))
* bump @typescript-eslint/eslint-plugin from 8.59.1 to 8.59.2 ([#131](https://github.com/gabrielpulga/ableton-dj-mcp/issues/131)) ([fdcbef5](https://github.com/gabrielpulga/ableton-dj-mcp/commit/fdcbef51fa50a7862b27d5056b57ff23ec707c6d))
* bump @typescript-eslint/eslint-plugin from 8.59.2 to 8.59.3 ([#135](https://github.com/gabrielpulga/ableton-dj-mcp/issues/135)) ([7d9110b](https://github.com/gabrielpulga/ableton-dj-mcp/commit/7d9110badb0f2be816cd7389e4c64a45866d24ac))
* bump @typescript-eslint/eslint-plugin from 8.59.3 to 8.59.4 ([#149](https://github.com/gabrielpulga/ableton-dj-mcp/issues/149)) ([5083635](https://github.com/gabrielpulga/ableton-dj-mcp/commit/508363560a71fb31276f172ffd6f6b5536484371))
* bump @typescript-eslint/eslint-plugin from 8.59.4 to 8.60.0 ([#157](https://github.com/gabrielpulga/ableton-dj-mcp/issues/157)) ([ed6250e](https://github.com/gabrielpulga/ableton-dj-mcp/commit/ed6250ef6d11de1ac9b5bf61a1f9549b5e6ff113))
* bump @typescript-eslint/eslint-plugin from 8.60.0 to 8.60.1 ([#165](https://github.com/gabrielpulga/ableton-dj-mcp/issues/165)) ([3e7ada4](https://github.com/gabrielpulga/ableton-dj-mcp/commit/3e7ada4e883ccc44149f3d11e1d2a84fe548ea78))
* bump @typescript-eslint/eslint-plugin from 8.60.1 to 8.61.0 ([#172](https://github.com/gabrielpulga/ableton-dj-mcp/issues/172)) ([9f74450](https://github.com/gabrielpulga/ableton-dj-mcp/commit/9f74450cdccb03d904937ec24b03913c61e1b159))
* bump @typescript-eslint/eslint-plugin from 8.61.0 to 8.62.0 ([#193](https://github.com/gabrielpulga/ableton-dj-mcp/issues/193)) ([93cf18b](https://github.com/gabrielpulga/ableton-dj-mcp/commit/93cf18bae2cecf2df1e1e694a54e6ad745513de4))
* bump @typescript-eslint/eslint-plugin from 8.62.0 to 8.62.1 ([#202](https://github.com/gabrielpulga/ableton-dj-mcp/issues/202)) ([7d3d768](https://github.com/gabrielpulga/ableton-dj-mcp/commit/7d3d768cf1e8fa45c520c1d54e64692b04c186c7))
* bump @typescript-eslint/eslint-plugin from 8.62.1 to 8.63.0 ([#210](https://github.com/gabrielpulga/ableton-dj-mcp/issues/210)) ([1f8d9b7](https://github.com/gabrielpulga/ableton-dj-mcp/commit/1f8d9b7dfa4e5be1f2adf23b6d19ba369062b7a3))
* bump @typescript-eslint/eslint-plugin from 8.63.0 to 8.64.0 ([#220](https://github.com/gabrielpulga/ableton-dj-mcp/issues/220)) ([bb4e0c9](https://github.com/gabrielpulga/ableton-dj-mcp/commit/bb4e0c989ba2c0a2b447f3d86b30ac9dce50c3d1))
* bump @typescript-eslint/eslint-plugin from 8.64.0 to 8.65.0 ([#227](https://github.com/gabrielpulga/ableton-dj-mcp/issues/227)) ([364ad10](https://github.com/gabrielpulga/ableton-dj-mcp/commit/364ad10b5523c087e5d52121b880c5e97e24e12e))
* bump @typescript-eslint/parser from 8.59.1 to 8.59.2 ([#127](https://github.com/gabrielpulga/ableton-dj-mcp/issues/127)) ([2964978](https://github.com/gabrielpulga/ableton-dj-mcp/commit/296497825996aafc90fed764aa168da14adfd631))
* bump @typescript-eslint/parser from 8.60.0 to 8.60.1 ([#162](https://github.com/gabrielpulga/ableton-dj-mcp/issues/162)) ([18012c3](https://github.com/gabrielpulga/ableton-dj-mcp/commit/18012c3817477f7de33d1994b7a2435317dd61b1))
* bump @typescript-eslint/parser from 8.60.1 to 8.61.0 ([#179](https://github.com/gabrielpulga/ableton-dj-mcp/issues/179)) ([4887280](https://github.com/gabrielpulga/ableton-dj-mcp/commit/488728037410f6f24173f46f2b8ff2ffa3b8246d))
* bump @typescript-eslint/parser from 8.61.0 to 8.61.1 ([#182](https://github.com/gabrielpulga/ableton-dj-mcp/issues/182)) ([7867606](https://github.com/gabrielpulga/ableton-dj-mcp/commit/78676060322838beba5cf59099ba80d736600d58))
* bump @typescript-eslint/parser from 8.62.0 to 8.62.1 ([#198](https://github.com/gabrielpulga/ableton-dj-mcp/issues/198)) ([a22dd16](https://github.com/gabrielpulga/ableton-dj-mcp/commit/a22dd16efac856ba413430fc0271dcb477a97b16))
* bump @typescript-eslint/parser from 8.63.0 to 8.64.0 ([#219](https://github.com/gabrielpulga/ableton-dj-mcp/issues/219)) ([37fcb30](https://github.com/gabrielpulga/ableton-dj-mcp/commit/37fcb3019be8582e066566dd493db3949132e1c9))
* bump @vitest/coverage-v8 from 4.1.5 to 4.1.6 ([#143](https://github.com/gabrielpulga/ableton-dj-mcp/issues/143)) ([fb083f8](https://github.com/gabrielpulga/ableton-dj-mcp/commit/fb083f8bad747a9a82c144c588f6e63f55db343c))
* bump @vitest/coverage-v8 from 4.1.9 to 4.1.10 ([#213](https://github.com/gabrielpulga/ableton-dj-mcp/issues/213)) ([9218b04](https://github.com/gabrielpulga/ableton-dj-mcp/commit/9218b041382461e2e415891c15b72347851dadb9))
* bump @vitest/eslint-plugin from 1.6.16 to 1.6.17 ([#134](https://github.com/gabrielpulga/ableton-dj-mcp/issues/134)) ([d405176](https://github.com/gabrielpulga/ableton-dj-mcp/commit/d405176daf55d2a1f713663a71d9f6d6063995ab))
* bump @vitest/eslint-plugin from 1.6.17 to 1.6.18 ([#147](https://github.com/gabrielpulga/ableton-dj-mcp/issues/147)) ([90f3964](https://github.com/gabrielpulga/ableton-dj-mcp/commit/90f39648795c5a38bd33be0cbadfb6cc59949391))
* bump @vitest/eslint-plugin from 1.6.18 to 1.6.19 ([#159](https://github.com/gabrielpulga/ableton-dj-mcp/issues/159)) ([8ce977f](https://github.com/gabrielpulga/ableton-dj-mcp/commit/8ce977f469e537ee78d47072e7d2053d36739ab2))
* bump @vitest/eslint-plugin from 1.6.19 to 1.6.20 ([#177](https://github.com/gabrielpulga/ableton-dj-mcp/issues/177)) ([bd422da](https://github.com/gabrielpulga/ableton-dj-mcp/commit/bd422da2f4a71526ce263087ba36ff6ad98ec4e0))
* bump @vitest/eslint-plugin from 1.6.20 to 1.6.21 ([#201](https://github.com/gabrielpulga/ableton-dj-mcp/issues/201)) ([e04a9df](https://github.com/gabrielpulga/ableton-dj-mcp/commit/e04a9dfdb5d6a7271775ca5470006e3c2777002b))
* bump @vitest/eslint-plugin from 1.6.21 to 1.6.23 ([#209](https://github.com/gabrielpulga/ableton-dj-mcp/issues/209)) ([4affa2b](https://github.com/gabrielpulga/ableton-dj-mcp/commit/4affa2b571f9c352667c9307cd7a9808843646dd))
* bump @vitest/eslint-plugin from 1.6.23 to 1.6.24 ([#223](https://github.com/gabrielpulga/ableton-dj-mcp/issues/223)) ([7470062](https://github.com/gabrielpulga/ableton-dj-mcp/commit/7470062171d9df97f34edc98d7aa67dac169939e))
* bump chokidar from 3.6.0 to 5.0.0 ([#130](https://github.com/gabrielpulga/ableton-dj-mcp/issues/130)) ([f214cd5](https://github.com/gabrielpulga/ableton-dj-mcp/commit/f214cd5b0c2dfd91e41a609fcc430e1288b42b6d))
* bump eslint from 10.4.0 to 10.4.1 ([#154](https://github.com/gabrielpulga/ableton-dj-mcp/issues/154)) ([e2d922b](https://github.com/gabrielpulga/ableton-dj-mcp/commit/e2d922bf911ab59c48cadd408c2e6653fc2d6103))
* bump eslint from 10.4.1 to 10.5.0 ([#178](https://github.com/gabrielpulga/ableton-dj-mcp/issues/178)) ([fee6349](https://github.com/gabrielpulga/ableton-dj-mcp/commit/fee63493a385e04f8963c3df5d8bdd0f31978728))
* bump eslint from 10.5.0 to 10.6.0 ([#194](https://github.com/gabrielpulga/ableton-dj-mcp/issues/194)) ([7684870](https://github.com/gabrielpulga/ableton-dj-mcp/commit/7684870e3ca2d17596aea75e5a8534716dd57ea0))
* bump eslint from 10.6.0 to 10.7.0 ([#212](https://github.com/gabrielpulga/ableton-dj-mcp/issues/212)) ([4e0cd8c](https://github.com/gabrielpulga/ableton-dj-mcp/commit/4e0cd8c6ec87cd078f659ceac7075016f4cfa706))
* bump eslint from 10.7.0 to 10.8.0 ([#224](https://github.com/gabrielpulga/ableton-dj-mcp/issues/224)) ([5ffb8d4](https://github.com/gabrielpulga/ableton-dj-mcp/commit/5ffb8d449dbc2ad980436e45445306b707f141c6))
* bump eslint from 9.39.4 to 10.4.0 ([#138](https://github.com/gabrielpulga/ableton-dj-mcp/issues/138)) ([d39aa1d](https://github.com/gabrielpulga/ableton-dj-mcp/commit/d39aa1df5a87a0f164b81949b2b8f79e4200eefc))
* bump eslint-import-resolver-node from 0.3.10 to 0.4.0 ([#140](https://github.com/gabrielpulga/ableton-dj-mcp/issues/140)) ([745c9ea](https://github.com/gabrielpulga/ableton-dj-mcp/commit/745c9eab8301ebca726948ecac29c87abd2fd4bf))
* bump eslint-import-resolver-typescript from 4.4.4 to 4.4.5 ([#169](https://github.com/gabrielpulga/ableton-dj-mcp/issues/169)) ([61aefb4](https://github.com/gabrielpulga/ableton-dj-mcp/commit/61aefb4c18337bd08cb30594f9b5058b2d2dcbf3))
* bump eslint-plugin-jsdoc from 62.9.0 to 63.0.0 ([#148](https://github.com/gabrielpulga/ableton-dj-mcp/issues/148)) ([1a65f7e](https://github.com/gabrielpulga/ableton-dj-mcp/commit/1a65f7e0e9b6c0177f4911d34cae4a78156410f9))
* bump eslint-plugin-jsdoc from 63.0.0 to 63.0.1 ([#155](https://github.com/gabrielpulga/ableton-dj-mcp/issues/155)) ([b5cdf66](https://github.com/gabrielpulga/ableton-dj-mcp/commit/b5cdf66871d66003cf05b780ec66871f942102aa))
* bump eslint-plugin-jsdoc from 63.0.1 to 63.0.2 ([#161](https://github.com/gabrielpulga/ableton-dj-mcp/issues/161)) ([9bc5af6](https://github.com/gabrielpulga/ableton-dj-mcp/commit/9bc5af6354bdd886cc592747d8985822e04af9bf))
* bump eslint-plugin-jsdoc from 63.0.10 to 63.0.12 ([#199](https://github.com/gabrielpulga/ableton-dj-mcp/issues/199)) ([7652b5c](https://github.com/gabrielpulga/ableton-dj-mcp/commit/7652b5cd03e0e71764732890bedb6ceda1fa5a05))
* bump eslint-plugin-jsdoc from 63.0.12 to 63.0.13 ([#207](https://github.com/gabrielpulga/ableton-dj-mcp/issues/207)) ([48b9d9c](https://github.com/gabrielpulga/ableton-dj-mcp/commit/48b9d9c1f25749cfde498e26521a09d06d9e41d2))
* bump eslint-plugin-jsdoc from 63.0.13 to 63.2.0 ([#218](https://github.com/gabrielpulga/ableton-dj-mcp/issues/218)) ([e1b510a](https://github.com/gabrielpulga/ableton-dj-mcp/commit/e1b510a103dd72943a425af64efda299d9d4f528))
* bump eslint-plugin-jsdoc from 63.0.2 to 63.0.7 ([#186](https://github.com/gabrielpulga/ableton-dj-mcp/issues/186)) ([0880896](https://github.com/gabrielpulga/ableton-dj-mcp/commit/0880896be1a5edaf11d54dc048857186a1e8997c))
* bump eslint-plugin-jsdoc from 63.0.7 to 63.0.10 ([#191](https://github.com/gabrielpulga/ableton-dj-mcp/issues/191)) ([a1c2398](https://github.com/gabrielpulga/ableton-dj-mcp/commit/a1c23984276a103a9e6dc36f7e041be6f21d7a3c))
* bump eslint-plugin-jsdoc from 63.2.0 to 63.3.0 ([#226](https://github.com/gabrielpulga/ableton-dj-mcp/issues/226)) ([0382b42](https://github.com/gabrielpulga/ableton-dj-mcp/commit/0382b428b5f836cd9d17284efc22c9e7f9805cbf))
* bump eslint-plugin-sonarjs from 4.0.3 to 4.1.0 ([#187](https://github.com/gabrielpulga/ableton-dj-mcp/issues/187)) ([67886cb](https://github.com/gabrielpulga/ableton-dj-mcp/commit/67886cb45650ca3a17b651472bb5a41ef7189630))
* bump eslint-plugin-sonarjs from 4.1.0 to 4.2.0 ([#221](https://github.com/gabrielpulga/ableton-dj-mcp/issues/221)) ([b830cde](https://github.com/gabrielpulga/ableton-dj-mcp/commit/b830cde299c338806d3812385ea9ccf644623033))
* bump eslint-plugin-unicorn from 64.0.0 to 65.0.0 ([#167](https://github.com/gabrielpulga/ableton-dj-mcp/issues/167)) ([0783015](https://github.com/gabrielpulga/ableton-dj-mcp/commit/078301514a557c62d3129d2125f23e4a419e4d63))
* bump eslint-plugin-unicorn from 65.0.0 to 66.0.0 ([#175](https://github.com/gabrielpulga/ableton-dj-mcp/issues/175)) ([7f34465](https://github.com/gabrielpulga/ableton-dj-mcp/commit/7f34465fc368b4ab28a1548e398632baf90f1885))
* bump eslint-plugin-unicorn from 66.0.0 to 68.0.0 ([#188](https://github.com/gabrielpulga/ableton-dj-mcp/issues/188)) ([f4a58d9](https://github.com/gabrielpulga/ableton-dj-mcp/commit/f4a58d96a20d92b79dffc87e544f29a2732cd35b))
* bump eslint-plugin-unicorn from 68.0.0 to 69.0.0 ([#190](https://github.com/gabrielpulga/ableton-dj-mcp/issues/190)) ([4e53b8c](https://github.com/gabrielpulga/ableton-dj-mcp/commit/4e53b8c89c8e4acd26c6c57c616c29494c663385))
* bump eslint-plugin-unicorn from 69.0.0 to 71.0.0 ([#197](https://github.com/gabrielpulga/ableton-dj-mcp/issues/197)) ([231d3e0](https://github.com/gabrielpulga/ableton-dj-mcp/commit/231d3e0cba3e06caa55892fbf38968c05367f73a))
* bump eslint-plugin-unicorn from 71.0.0 to 71.1.0 ([#208](https://github.com/gabrielpulga/ableton-dj-mcp/issues/208)) ([03c2758](https://github.com/gabrielpulga/ableton-dj-mcp/commit/03c275835861213263df6feeb89f17b75bca98fe))
* bump eslint-plugin-unicorn from 71.1.0 to 72.0.0 ([#217](https://github.com/gabrielpulga/ableton-dj-mcp/issues/217)) ([35e7f24](https://github.com/gabrielpulga/ableton-dj-mcp/commit/35e7f245aa8563d07ad710d8317255c9e2c3c4bc))
* bump jscpd from 4.0.9 to 4.1.0 ([#132](https://github.com/gabrielpulga/ableton-dj-mcp/issues/132)) ([5628d22](https://github.com/gabrielpulga/ableton-dj-mcp/commit/5628d2270a2270a986578291d131614d9b5c50e9))
* bump jscpd from 4.1.0 to 4.2.3 ([#142](https://github.com/gabrielpulga/ableton-dj-mcp/issues/142)) ([4393a16](https://github.com/gabrielpulga/ableton-dj-mcp/commit/4393a16c3b74b0f9b8d3f4f0ada464ebcf9666cc))
* bump jscpd from 4.2.3 to 4.2.4 ([#160](https://github.com/gabrielpulga/ableton-dj-mcp/issues/160)) ([658ca47](https://github.com/gabrielpulga/ableton-dj-mcp/commit/658ca4788db23fc8ba6981b83d47e673767e92b1))
* bump jscpd from 4.2.4 to 4.2.5 ([#168](https://github.com/gabrielpulga/ableton-dj-mcp/issues/168)) ([4815153](https://github.com/gabrielpulga/ableton-dj-mcp/commit/4815153dbd716a99543623c9df69779cf11d8b76))
* bump jscpd from 4.2.5 to 5.0.9 ([#173](https://github.com/gabrielpulga/ableton-dj-mcp/issues/173)) ([2f21d2d](https://github.com/gabrielpulga/ableton-dj-mcp/commit/2f21d2d343653d8213e20f015393a19397fc8cbe))
* bump jscpd from 5.0.11 to 5.0.12 ([#214](https://github.com/gabrielpulga/ableton-dj-mcp/issues/214)) ([b9433b1](https://github.com/gabrielpulga/ableton-dj-mcp/commit/b9433b1ffd0f29af3ddccf21bbf67dad0778fe69))
* bump jscpd from 5.0.9 to 5.0.11 ([#181](https://github.com/gabrielpulga/ableton-dj-mcp/issues/181)) ([e274e90](https://github.com/gabrielpulga/ableton-dj-mcp/commit/e274e90281293b203047c29562084ac32cee4232))
* bump prettier from 3.8.3 to 3.8.4 ([#174](https://github.com/gabrielpulga/ableton-dj-mcp/issues/174)) ([7813618](https://github.com/gabrielpulga/ableton-dj-mcp/commit/7813618a9908369f66c76dbef75ff8430d166326))
* bump prettier from 3.8.4 to 3.9.1 ([#192](https://github.com/gabrielpulga/ableton-dj-mcp/issues/192)) ([8860149](https://github.com/gabrielpulga/ableton-dj-mcp/commit/886014940fabed61bc3c0513c6d99ff3b4059df2))
* bump prettier from 3.9.1 to 3.9.4 ([#203](https://github.com/gabrielpulga/ableton-dj-mcp/issues/203)) ([f066479](https://github.com/gabrielpulga/ableton-dj-mcp/commit/f066479ace3fde74080acbf43bef50fcc94fb108))
* bump prettier from 3.9.4 to 3.9.5 ([#206](https://github.com/gabrielpulga/ableton-dj-mcp/issues/206)) ([6d8278e](https://github.com/gabrielpulga/ableton-dj-mcp/commit/6d8278e622979a64bd29f054a45c3155d86b25c6))
* bump prettier from 3.9.5 to 3.9.6 ([#222](https://github.com/gabrielpulga/ableton-dj-mcp/issues/222)) ([20e4b5c](https://github.com/gabrielpulga/ableton-dj-mcp/commit/20e4b5c69b2b6677e1b871c9adb933823bdbdd48))
* bump rollup from 4.60.2 to 4.60.3 ([#128](https://github.com/gabrielpulga/ableton-dj-mcp/issues/128)) ([8fbebee](https://github.com/gabrielpulga/ableton-dj-mcp/commit/8fbebee0d687390ba34d05522c88ea4775ff997a))
* bump rollup from 4.60.3 to 4.60.4 ([#137](https://github.com/gabrielpulga/ableton-dj-mcp/issues/137)) ([fff043e](https://github.com/gabrielpulga/ableton-dj-mcp/commit/fff043e95ed0821f4831a00cbb168c1d664062c8))
* bump rollup from 4.60.4 to 4.61.1 ([#164](https://github.com/gabrielpulga/ableton-dj-mcp/issues/164)) ([c88b52f](https://github.com/gabrielpulga/ableton-dj-mcp/commit/c88b52f35f09fbebf40e3456860cede6f870df37))
* bump rollup from 4.61.1 to 4.62.0 ([#176](https://github.com/gabrielpulga/ableton-dj-mcp/issues/176)) ([adc4ec2](https://github.com/gabrielpulga/ableton-dj-mcp/commit/adc4ec219c0616353a392eee9bafec41145e9fb4))
* bump rollup from 4.62.0 to 4.62.2 ([#189](https://github.com/gabrielpulga/ableton-dj-mcp/issues/189)) ([4fe18cb](https://github.com/gabrielpulga/ableton-dj-mcp/commit/4fe18cb8ee6b872017f3a697b5f9b6c5c2337f00))
* bump rollup from 4.62.2 to 4.62.3 ([#225](https://github.com/gabrielpulga/ableton-dj-mcp/issues/225)) ([8eb2309](https://github.com/gabrielpulga/ableton-dj-mcp/commit/8eb2309482352c78f628838625fc685fea8f1e9e))
* bump typescript from 6.0.3 to 7.0.2 ([#205](https://github.com/gabrielpulga/ableton-dj-mcp/issues/205)) ([e6d79c5](https://github.com/gabrielpulga/ableton-dj-mcp/commit/e6d79c50869800d70acc89eace5116a8882dbeea))
* bump vitest from 4.1.5 to 4.1.6 ([#136](https://github.com/gabrielpulga/ableton-dj-mcp/issues/136)) ([874086b](https://github.com/gabrielpulga/ableton-dj-mcp/commit/874086bf0e5c193a604b3842fdc0cc479635dedb))
* bump vitest from 4.1.6 to 4.1.7 ([#146](https://github.com/gabrielpulga/ableton-dj-mcp/issues/146)) ([2c29311](https://github.com/gabrielpulga/ableton-dj-mcp/commit/2c293115b7887c864cb0cb3e50b3c1cb22b2f1d5))
* bump vitest from 4.1.7 to 4.1.8 ([#170](https://github.com/gabrielpulga/ableton-dj-mcp/issues/170)) ([687fc60](https://github.com/gabrielpulga/ableton-dj-mcp/commit/687fc60bc6dc015b4dd6492a2587318af7262f92))
* bump vitest from 4.1.8 to 4.1.9 ([#183](https://github.com/gabrielpulga/ableton-dj-mcp/issues/183)) ([90a3ddc](https://github.com/gabrielpulga/ableton-dj-mcp/commit/90a3ddc9fea098355d27d6b9e7151dba5a3809e6))
* bump vitest from 4.1.9 to 4.1.10 ([#211](https://github.com/gabrielpulga/ableton-dj-mcp/issues/211)) ([1f48bfc](https://github.com/gabrielpulga/ableton-dj-mcp/commit/1f48bfc3e220b722eb26f41bb1615fc50b656c97))
* bump zod from 4.4.2 to 4.4.3 ([#129](https://github.com/gabrielpulga/ableton-dj-mcp/issues/129)) ([fa08a4c](https://github.com/gabrielpulga/ableton-dj-mcp/commit/fa08a4c5513ede3b25e69d1b6d4f05993f8bd263))

## [1.11.0](https://github.com/gabrielpulga/ableton-dj-mcp/compare/ableton-dj-mcp-v1.10.0...ableton-dj-mcp-v1.11.0) (2026-05-07)


### Features

* build-info banner + [#26](https://github.com/gabrielpulga/ableton-dj-mcp/issues/26) design pivot ([#117](https://github.com/gabrielpulga/ableton-dj-mcp/issues/117)) ([2e07db7](https://github.com/gabrielpulga/ableton-dj-mcp/commit/2e07db7bb3eb623b4524026a153846958d9ce3ad))
* Live Browser Bridge — adj-browse + browserUri loading via Python sidecar ([#119](https://github.com/gabrielpulga/ableton-dj-mcp/issues/119)) ([cf5b9d7](https://github.com/gabrielpulga/ableton-dj-mcp/commit/cf5b9d7ce12fbdb82a10234867336eb199a56eb1))

## [1.10.0](https://github.com/gabrielpulga/ableton-dj-mcp/compare/ableton-dj-mcp-v1.9.0...ableton-dj-mcp-v1.10.0) (2026-05-07)


### Features

* add 5 standalone playback workflow actions ([#100](https://github.com/gabrielpulga/ableton-dj-mcp/issues/100)) ([a1ee67d](https://github.com/gabrielpulga/ableton-dj-mcp/commit/a1ee67d78317f6a5a56fce2e7bf73edff402aad5))
* add install:device script for User Library install ([#107](https://github.com/gabrielpulga/ableton-dj-mcp/issues/107)) ([2578f62](https://github.com/gabrielpulga/ableton-dj-mcp/commit/2578f62dac499a70e2bc1d9f5cf5f1eb87dfa040))
* add npm run dev:hot for zero-touch dev loop ([#115](https://github.com/gabrielpulga/ableton-dj-mcp/issues/115)) ([c726a77](https://github.com/gabrielpulga/ableton-dj-mcp/commit/c726a7721d3d73b5de5fb982411d8f0e7ad69558))
* add opt-in portal lazy-boot for Ableton Live ([#109](https://github.com/gabrielpulga/ableton-dj-mcp/issues/109)) ([f482346](https://github.com/gabrielpulga/ableton-dj-mcp/commit/f4823460df8dde0ce0d853c8531785a3e8b3a30c))
* add start:live launcher script ([#108](https://github.com/gabrielpulga/ableton-dj-mcp/issues/108)) ([8d5ef09](https://github.com/gabrielpulga/ableton-dj-mcp/commit/8d5ef0923f10198da54934e2ae3aed16950e11d3))


### Bug Fixes

* extract shared User Library path resolver, fix CI ([#116](https://github.com/gabrielpulga/ableton-dj-mcp/issues/116)) ([01cf6c7](https://github.com/gabrielpulga/ableton-dj-mcp/commit/01cf6c7a2eda58fb6c9054ac497bd532bbee582e))
* install:device must copy .maxpat files too ([#110](https://github.com/gabrielpulga/ableton-dj-mcp/issues/110)) ([8a2d390](https://github.com/gabrielpulga/ableton-dj-mcp/commit/8a2d39066d20409273bc7a8f6f1ceb7ef7f6fdc2))
* unwrap array return from get_version_string Live API call ([#104](https://github.com/gabrielpulga/ableton-dj-mcp/issues/104)) ([0fbb8c7](https://github.com/gabrielpulga/ableton-dj-mcp/commit/0fbb8c723681f1dce50f7ef28f1c4c7e371775c6))


### Dependencies

* bump @typescript-eslint/eslint-plugin from 8.59.0 to 8.59.1 ([#99](https://github.com/gabrielpulga/ableton-dj-mcp/issues/99)) ([dcb4fc9](https://github.com/gabrielpulga/ableton-dj-mcp/commit/dcb4fc9a7fbeaf0115cd6da54a5bf4d9b9808e57))
* bump @typescript-eslint/parser from 8.59.0 to 8.59.1 ([#96](https://github.com/gabrielpulga/ableton-dj-mcp/issues/96)) ([5a1b491](https://github.com/gabrielpulga/ableton-dj-mcp/commit/5a1b491701e11fbbf9bf8d202ff91074d087aed2))
* bump eslint from 9.39.4 to 10.3.0 ([#97](https://github.com/gabrielpulga/ableton-dj-mcp/issues/97)) ([c72691f](https://github.com/gabrielpulga/ableton-dj-mcp/commit/c72691f2f8a1f09384ce196fbd363dde5e1e141f))
* bump zod from 4.3.6 to 4.4.2 ([#98](https://github.com/gabrielpulga/ableton-dj-mcp/issues/98)) ([98fe29a](https://github.com/gabrielpulga/ableton-dj-mcp/commit/98fe29a00c400684b1ade7ddab8daa33b0e760c1))

## [1.9.0](https://github.com/gabrielpulga/ableton-dj-mcp/compare/ableton-dj-mcp-v1.8.1...ableton-dj-mcp-v1.9.0) (2026-04-26)


### Features

* add scaffolded workspace/ for personal music context ([#90](https://github.com/gabrielpulga/ableton-dj-mcp/issues/90)) ([4703e72](https://github.com/gabrielpulga/ableton-dj-mcp/commit/4703e725bc45e52075651cf5fccbddf3c321fb16))
* **workspace:** add findings system + mandatory capture rule ([#92](https://github.com/gabrielpulga/ableton-dj-mcp/issues/92)) ([c57b5d1](https://github.com/gabrielpulga/ableton-dj-mcp/commit/c57b5d18b1a99e866a06901603fb801375d9f4c2))

## [1.8.1](https://github.com/gabrielpulga/ableton-dj-mcp/compare/ableton-dj-mcp-v1.8.0...ableton-dj-mcp-v1.8.1) (2026-04-25)


### Bug Fixes

* correct adj-generate note output to put pitch before time ([#84](https://github.com/gabrielpulga/ableton-dj-mcp/issues/84)) ([ed9f8e9](https://github.com/gabrielpulga/ableton-dj-mcp/commit/ed9f8e97be35df27916975440f4cad851a8ed9dd))
* sync src/shared/version.ts with release-please bumps ([#82](https://github.com/gabrielpulga/ableton-dj-mcp/issues/82)) ([8656b87](https://github.com/gabrielpulga/ableton-dj-mcp/commit/8656b87c474bb8b8caa41f8617fe3a16624fd163))

## [1.8.0](https://github.com/gabrielpulga/ableton-dj-mcp/compare/ableton-dj-mcp-v1.7.0...ableton-dj-mcp-v1.8.0) (2026-04-25)


### Features

* add adj-generate tool for Euclidean rhythm patterns ([#80](https://github.com/gabrielpulga/ableton-dj-mcp/issues/80)) ([2efc238](https://github.com/gabrielpulga/ableton-dj-mcp/commit/2efc238be2065f7caf3ec02507ef9d4966c3177c))

## [1.7.0](https://github.com/gabrielpulga/ableton-dj-mcp/compare/ableton-dj-mcp-v1.6.1...ableton-dj-mcp-v1.7.0) (2026-04-22)


### Features

* add undo, redo, and save actions to adj-playback ([#74](https://github.com/gabrielpulga/ableton-dj-mcp/issues/74)) ([d548d01](https://github.com/gabrielpulga/ableton-dj-mcp/commit/d548d01b7e3dde9417eeb83b6425efbd35a5c814))

## [1.6.1](https://github.com/gabrielpulga/ableton-dj-mcp/compare/ableton-dj-mcp-v1.6.0...ableton-dj-mcp-v1.6.1) (2026-04-22)


### Bug Fixes

* rename producerPalVersion to serverVersion in connect response ([#43](https://github.com/gabrielpulga/ableton-dj-mcp/issues/43)) ([8afcf5a](https://github.com/gabrielpulga/ableton-dj-mcp/commit/8afcf5afbf0e8ab81bc86bd49d7d71e6ccb366fb))


### Dependencies

* bump @modelcontextprotocol/sdk from 1.28.0 to 1.29.0 ([#53](https://github.com/gabrielpulga/ableton-dj-mcp/issues/53)) ([90766cf](https://github.com/gabrielpulga/ableton-dj-mcp/commit/90766cf61f5dcaa1bc7d7671736fb36ce912eae4))
* bump @types/node from 25.5.0 to 25.5.2 ([#56](https://github.com/gabrielpulga/ableton-dj-mcp/issues/56)) ([01713cb](https://github.com/gabrielpulga/ableton-dj-mcp/commit/01713cbf0753efbc24882646b87972bb4b7b7079))
* bump @types/node from 25.5.2 to 25.6.0 ([#59](https://github.com/gabrielpulga/ableton-dj-mcp/issues/59)) ([c4b3685](https://github.com/gabrielpulga/ableton-dj-mcp/commit/c4b3685f5776d6ab3c8f887af4eff46670199f01))
* bump @typescript-eslint/eslint-plugin from 8.57.2 to 8.58.0 ([#55](https://github.com/gabrielpulga/ableton-dj-mcp/issues/55)) ([ffa217b](https://github.com/gabrielpulga/ableton-dj-mcp/commit/ffa217bef17a5e65466acd14070ec369ad46db14))
* bump @typescript-eslint/eslint-plugin from 8.58.0 to 8.58.1 ([#62](https://github.com/gabrielpulga/ableton-dj-mcp/issues/62)) ([968ca38](https://github.com/gabrielpulga/ableton-dj-mcp/commit/968ca3825fdcc41108a5963f47f29ac2451117f7))
* bump @typescript-eslint/eslint-plugin from 8.58.1 to 8.58.2 ([#72](https://github.com/gabrielpulga/ableton-dj-mcp/issues/72)) ([b4e9d94](https://github.com/gabrielpulga/ableton-dj-mcp/commit/b4e9d942921a36cd29fae3c8dfc2fdd58047d19a))
* bump @typescript-eslint/parser from 8.57.2 to 8.58.0 ([#52](https://github.com/gabrielpulga/ableton-dj-mcp/issues/52)) ([be8a07e](https://github.com/gabrielpulga/ableton-dj-mcp/commit/be8a07e0188845de58b80158f72114d8843f8733))
* bump @typescript-eslint/parser from 8.58.0 to 8.58.1 ([#57](https://github.com/gabrielpulga/ableton-dj-mcp/issues/57)) ([e2f5628](https://github.com/gabrielpulga/ableton-dj-mcp/commit/e2f5628633e7bd324b8248b9d23451e5143f87a6))
* bump @typescript-eslint/parser from 8.58.1 to 8.58.2 ([#70](https://github.com/gabrielpulga/ableton-dj-mcp/issues/70)) ([e75a394](https://github.com/gabrielpulga/ableton-dj-mcp/commit/e75a3949747e19eb8f72ea8d9f5334607cc0aba9))
* bump @vitest/eslint-plugin from 1.6.13 to 1.6.14 ([#49](https://github.com/gabrielpulga/ableton-dj-mcp/issues/49)) ([e2ed9ae](https://github.com/gabrielpulga/ableton-dj-mcp/commit/e2ed9ae55c26980c7b759b696dd5232b15978820))
* bump @vitest/eslint-plugin from 1.6.14 to 1.6.15 ([#58](https://github.com/gabrielpulga/ableton-dj-mcp/issues/58)) ([4c6cb74](https://github.com/gabrielpulga/ableton-dj-mcp/commit/4c6cb747a508c0757548d1e5bb8c4fcbde5899ac))
* bump @vitest/eslint-plugin from 1.6.15 to 1.6.16 ([#68](https://github.com/gabrielpulga/ableton-dj-mcp/issues/68)) ([2437b3c](https://github.com/gabrielpulga/ableton-dj-mcp/commit/2437b3cee3ca598e76d29c1ff793f9310ae3f12d))
* bump eslint from 10.1.0 to 10.2.0 ([#54](https://github.com/gabrielpulga/ableton-dj-mcp/issues/54)) ([e3d7c98](https://github.com/gabrielpulga/ableton-dj-mcp/commit/e3d7c987b17d86cb089dbe65ce2c568c9402a6cf))
* bump eslint from 10.2.0 to 10.2.1 ([#69](https://github.com/gabrielpulga/ableton-dj-mcp/issues/69)) ([e1d832b](https://github.com/gabrielpulga/ableton-dj-mcp/commit/e1d832bc1647f87ae611c328be4511616c3a2398))
* bump eslint from 9.39.4 to 10.1.0 ([#46](https://github.com/gabrielpulga/ableton-dj-mcp/issues/46)) ([5b98d88](https://github.com/gabrielpulga/ableton-dj-mcp/commit/5b98d88c4fb54bf4a7ef9e8044467d3317e242e0))
* bump eslint-import-resolver-node from 0.3.9 to 0.3.10 ([#48](https://github.com/gabrielpulga/ableton-dj-mcp/issues/48)) ([4ea6c13](https://github.com/gabrielpulga/ableton-dj-mcp/commit/4ea6c137c54eeb8964ddcd2d237b438394928274))
* bump eslint-plugin-jsdoc from 62.8.1 to 62.9.0 ([#51](https://github.com/gabrielpulga/ableton-dj-mcp/issues/51)) ([9e60cc9](https://github.com/gabrielpulga/ableton-dj-mcp/commit/9e60cc91e565a462196bf2169a6b44f44294dd26))
* bump eslint-plugin-sonarjs from 4.0.2 to 4.0.3 ([#65](https://github.com/gabrielpulga/ableton-dj-mcp/issues/65)) ([10c947f](https://github.com/gabrielpulga/ableton-dj-mcp/commit/10c947f44c5a1492c4891ed07c820f7e05a44e9d))
* bump jscpd from 4.0.8 to 4.0.9 ([#61](https://github.com/gabrielpulga/ableton-dj-mcp/issues/61)) ([a283852](https://github.com/gabrielpulga/ableton-dj-mcp/commit/a2838521d10739873465b3453982f17d07fa1af5))
* bump prettier from 3.8.1 to 3.8.2 ([#63](https://github.com/gabrielpulga/ableton-dj-mcp/issues/63)) ([f6a65d9](https://github.com/gabrielpulga/ableton-dj-mcp/commit/f6a65d93945a52a78ecafa63965a724ed5293819))
* bump prettier from 3.8.2 to 3.8.3 ([#71](https://github.com/gabrielpulga/ableton-dj-mcp/issues/71)) ([a627eeb](https://github.com/gabrielpulga/ableton-dj-mcp/commit/a627eebfceae25050ea27b7ce43b255a1420858f))
* bump rollup from 4.60.0 to 4.60.1 ([#50](https://github.com/gabrielpulga/ableton-dj-mcp/issues/50)) ([fc2f5b4](https://github.com/gabrielpulga/ableton-dj-mcp/commit/fc2f5b41d4e0a4fcd07d966fe8af78e1cef52d14))
* bump rollup from 4.60.1 to 4.60.2 ([#67](https://github.com/gabrielpulga/ableton-dj-mcp/issues/67)) ([f1e664a](https://github.com/gabrielpulga/ableton-dj-mcp/commit/f1e664a4241764bbbc612b544401ec3debaba8e4))
* bump typescript from 5.9.3 to 6.0.2 ([#47](https://github.com/gabrielpulga/ableton-dj-mcp/issues/47)) ([cfb44d3](https://github.com/gabrielpulga/ableton-dj-mcp/commit/cfb44d3cc976d3c00f455166b0bcb1a57fd506ff))
* bump typescript from 6.0.2 to 6.0.3 ([#66](https://github.com/gabrielpulga/ableton-dj-mcp/issues/66)) ([ddb094d](https://github.com/gabrielpulga/ableton-dj-mcp/commit/ddb094dd9b31fa5116e77269d08b4d4bc4b96b4e))
* bump vitest from 4.1.2 to 4.1.4 ([#60](https://github.com/gabrielpulga/ableton-dj-mcp/issues/60)) ([7c1c659](https://github.com/gabrielpulga/ableton-dj-mcp/commit/7c1c659b901dc619d4ebedaed21ba5ae6fb640b1))

## [1.6.0](https://github.com/gabrielpulga/ableton-dj-mcp/compare/ableton-dj-mcp-v1.5.0...ableton-dj-mcp-v1.6.0) (2026-03-28)


### Features

* add production knowledge base with techniques, references, and scalable skills architecture ([#16](https://github.com/gabrielpulga/ableton-dj-mcp/issues/16)) ([8218cf0](https://github.com/gabrielpulga/ableton-dj-mcp/commit/8218cf00d451ea9c3c75cb268aff1a722bc13b0e))
* add psytrance genre theory to electronic music skills ([#22](https://github.com/gabrielpulga/ableton-dj-mcp/issues/22)) ([9a4f7b0](https://github.com/gabrielpulga/ableton-dj-mcp/commit/9a4f7b0097d72914b785e408aa4b4dc9064574cf))

## [1.5.0](https://github.com/gabrielpulga/ableton-dj-mcp/compare/ableton-dj-mcp-v1.4.5...ableton-dj-mcp-v1.5.0) (2026-03-28)


### Features

* enrich electronic music skills with genre theory and patterns ([#11](https://github.com/gabrielpulga/ableton-dj-mcp/issues/11)) ([7ad8180](https://github.com/gabrielpulga/ableton-dj-mcp/commit/7ad8180f5e9555b7dae8614c5da06ae1b0204362))


### Bug Fixes

* correct self-referential APP_NAME declaration in file-logger ([287d5d8](https://github.com/gabrielpulga/ableton-dj-mcp/commit/287d5d8328d4b01c0c6fc30b155b67ee91ff05c5))
* remove stale webui entries from lint suppression limits test ([#10](https://github.com/gabrielpulga/ableton-dj-mcp/issues/10)) ([e6d33d9](https://github.com/gabrielpulga/ableton-dj-mcp/commit/e6d33d9aeddf0bdd83b1a3686fdcfae7bd8bd43b))
* resolve lint and format violations ([b251ea8](https://github.com/gabrielpulga/ableton-dj-mcp/commit/b251ea8762a37bd5df743209258de58c2f4e008d))
* REST API now respects ENABLE_RAW_LIVE_API env flag ([af611c0](https://github.com/gabrielpulga/ableton-dj-mcp/commit/af611c0c2b5821ba1230a6e8380635b0bd35f19a))
* REST API now respects ENABLE_RAW_LIVE_API env flag ([49a79c6](https://github.com/gabrielpulga/ableton-dj-mcp/commit/49a79c638c66acfa1fc1dc8b260f45a847df33bc))


### Dependencies

* Bump @modelcontextprotocol/sdk from 1.27.1 to 1.28.0 ([#5](https://github.com/gabrielpulga/ableton-dj-mcp/issues/5)) ([489db30](https://github.com/gabrielpulga/ableton-dj-mcp/commit/489db306855c0c8f3161406f83afaa488163c179))
* Bump @vitest/coverage-v8 from 4.1.1 to 4.1.2 ([#7](https://github.com/gabrielpulga/ableton-dj-mcp/issues/7)) ([23a9ae5](https://github.com/gabrielpulga/ableton-dj-mcp/commit/23a9ae57979506dfc48c693bff405be8b8027eea))
* Bump eslint-plugin-jsdoc from 62.8.0 to 62.8.1 ([#3](https://github.com/gabrielpulga/ableton-dj-mcp/issues/3)) ([8144ed8](https://github.com/gabrielpulga/ableton-dj-mcp/commit/8144ed8259beb41635e0fa213552737da0103ade))
* Bump eslint-plugin-unicorn from 63.0.0 to 64.0.0 ([#6](https://github.com/gabrielpulga/ableton-dj-mcp/issues/6)) ([84e71a0](https://github.com/gabrielpulga/ableton-dj-mcp/commit/84e71a054e3bed5eb0b339efc6810f084cfe758c))

## Changelog

All notable changes to this project will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and
this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Releases are automated by
[release-please](https://github.com/googleapis/release-please). Commit messages
follow the [Conventional Commits](https://www.conventionalcommits.org/) spec.

<!-- releases below this line are managed automatically -->
