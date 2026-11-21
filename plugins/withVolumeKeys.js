const { withMainActivity } = require('expo/config-plugins');

const METHOD = `
  override fun dispatchKeyEvent(event: android.view.KeyEvent): Boolean {
    if (expo.modules.volumekeys.VolumeKeysModule.onKey(event)) return true
    return super.dispatchKeyEvent(event)
  }
`;

module.exports = (config) =>
  withMainActivity(config, (cfg) => {
    const src = cfg.modResults.contents;
    if (!src.includes('VolumeKeysModule')) {
      const i = src.lastIndexOf('}');
      cfg.modResults.contents = src.slice(0, i) + METHOD + src.slice(i);
    }
    return cfg;
  });
