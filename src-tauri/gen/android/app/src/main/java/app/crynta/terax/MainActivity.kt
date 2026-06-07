package app.crynta.terax

import android.os.Bundle
import android.util.Log
import android.view.View
import android.webkit.JavascriptInterface
import android.webkit.WebView
import androidx.activity.enableEdgeToEdge
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
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)

    // Handle IME (keyboard) insets — pad the root view so the WebView
    // shrinks when the soft keyboard opens, keeping content visible.
    val rootView = findViewById<View>(android.R.id.content)
    ViewCompat.setOnApplyWindowInsetsListener(rootView) { v, insets ->
      val ime = insets.getInsets(WindowInsetsCompat.Type.ime())
      val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
      v.setPadding(0, 0, 0, max(bars.bottom, ime.bottom))
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
