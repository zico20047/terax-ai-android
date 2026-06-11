package app.crynta.terax

import android.graphics.Color
import android.os.Bundle
import android.util.Log
import android.view.View
import android.view.ViewGroup
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.widget.FrameLayout
import androidx.activity.OnBackPressedCallback
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import kotlin.math.max

class MainActivity : TauriActivity() {
  companion object {
    const val TAG = "TeraxBack"
  }

  @Volatile
  var backConsumedByJs = false

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    WebView.setWebContentsDebuggingEnabled(true)

    window.statusBarColor = Color.BLACK
    window.navigationBarColor = Color.BLACK

    // Without enableEdgeToEdge(), adjustResize handles both keyboard and
    // system bars automatically. We only need to dispatch resize events
    // so xterm.js FitAddon recalculates terminal dimensions.
    val rootView = findViewById<View>(android.R.id.content)
    ViewCompat.setOnApplyWindowInsetsListener(rootView) { v, insets ->
      val ime = insets.getInsets(WindowInsetsCompat.Type.ime())
      val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars())

      // Pad for keyboard (IME) only. The navigation bar is handled by
      // adjustResize when keyboard is hidden; when keyboard IS shown the
      // IME inset already includes the nav bar area so we don't double-count.
      v.setPadding(0, 0, 0, max(0, ime.bottom - bars.bottom))

      // Dispatch resize event so xterm.js FitAddon recalculates
      val wv = findWebViewRecursive(window.decorView)
      if (wv != null) {
        wv.post {
          wv.evaluateJavascript(
            "try{window.dispatchEvent(new Event('resize'));}catch(e){}",
            null
          )
        }
      }
      insets
    }

    // Add JS interface so JS can synchronously set the back-consumed flag.
    // Use a delayed post to ensure the WebView is fully created.
    window.decorView.postDelayed({
      val wv = findWebViewRecursive(window.decorView)
      if (wv != null) {
        wv.addJavascriptInterface(BackInterface(this), "TeraxBack")
        Log.i(TAG, "TeraxBack JS interface added to WebView")
      } else {
        Log.w(TAG, "WebView not found — retrying in 500ms")
        window.decorView.postDelayed({
          val wv2 = findWebViewRecursive(window.decorView)
          if (wv2 != null) {
            wv2.addJavascriptInterface(BackInterface(this), "TeraxBack")
            Log.i(TAG, "TeraxBack JS interface added (retry)")
          } else {
            Log.e(TAG, "WebView not found after retry — back button won't work")
          }
        }, 500)
      }
    }, 500)

    onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
      override fun handleOnBackPressed() {
        Log.d(TAG, "handleOnBackPressed: backConsumedByJs=$backConsumedByJs")
        if (backConsumedByJs) {
          val wv = findWebViewRecursive(window.decorView)
          wv?.evaluateJavascript("if(window.__teraxHandleBack) window.__teraxHandleBack();", null)
        } else {
          finish()
        }
      }
    })
  }

  inner class BackInterface(private val activity: MainActivity) {
    @JavascriptInterface
    fun setConsumed(value: Boolean) {
      Log.d(TAG, "setConsumed: $value")
      activity.backConsumedByJs = value
    }
  }

  private fun findWebViewRecursive(view: android.view.View): WebView? {
    if (view is WebView) return view
    if (view is android.view.ViewGroup) {
      for (i in 0 until view.childCount) {
        val found = findWebViewRecursive(view.getChildAt(i))
        if (found != null) return found
      }
    }
    return null
  }
}
