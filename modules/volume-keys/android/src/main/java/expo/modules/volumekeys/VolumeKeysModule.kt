package expo.modules.volumekeys

import android.view.KeyEvent
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Swallows hardware volume keys (so the system volume never changes) and forwards them to JS,
 * but only while JS has enabled it (a scoring screen is visible).
 * MainActivity.dispatchKeyEvent is patched by plugins/withVolumeKeys.js to call [onKey].
 */
class VolumeKeysModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("VolumeKeys")
    Events("onVolumeKey")

    OnCreate { listener = { dir -> sendEvent("onVolumeKey", mapOf("direction" to dir)) } }
    OnDestroy { listener = null }

    Function("setEnabled") { on: Boolean -> enabled = on }
  }

  companion object {
    @Volatile var enabled = false
    @Volatile var listener: ((String) -> Unit)? = null

    @JvmStatic
    fun onKey(event: KeyEvent): Boolean {
      if (!enabled) return false
      val dir = when (event.keyCode) {
        KeyEvent.KEYCODE_VOLUME_UP -> "up"
        KeyEvent.KEYCODE_VOLUME_DOWN -> "down"
        else -> return false
      }
      if (event.action == KeyEvent.ACTION_DOWN && event.repeatCount == 0) listener?.invoke(dir)
      return true
    }
  }
}
