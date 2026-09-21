# ThinkTank Academia — Android Integration Guide

This guide describes how to connect a native Android application (Kotlin / Jetpack Compose) to the ThinkTank Academia backend.

Both the web application and the Android app share the same REST API.

---

## 1. Architecture Overview

```text
               ┌── Web Frontend (React SPA)
               │
ThinkTank API ── Android App (Kotlin / Jetpack Compose)
(/api/v1)      │
               └── Admin Management Console
                     │
                     ↓
             Turso SQLite Database
```

- **Base URL (production):** `https://thinktank-academia.onrender.com/api/v1/`
  (Retrofit requires the trailing slash. Opening this URL in a browser returns the API discovery document — a `200` JSON listing of every endpoint — so you can confirm the service is up and that the app is pointed at the right host.)
- **Authentication:** Standard JWT Bearer token in the `Authorization: Bearer <token>` header.
- **Envelope Format:**
  - Success: `{ "success": true, "data": T }`
  - Error: `{ "success": false, "error": { "code": string, "message": string, "details": any } }`
- **No CORS, no API key:** native apps are not subject to browser CORS rules, and every public endpoint works without any credential. Only `user`/`admin` endpoints need the Bearer token obtained from `POST auth/login` or `POST auth/register`.
- **Connectivity check:** `GET health` (→ `{ ok: true, version: "v1" }`) is the cheapest ping; `GET ""` (the base URL itself) returns the full discovery document with `baseUrl`, `links`, `auth` and `groups[]`.

### Quick verification from a terminal

```bash
curl https://thinktank-academia.onrender.com/api/v1/health
# {"ok":true,"service":"thinktank-academia","version":"v1","env":"production"}

curl https://thinktank-academia.onrender.com/api/v1/
# {"success":true,"data":{"name":"ThinkTank Academia API","version":"v1", ... "groups":[...]}}

curl -X POST https://thinktank-academia.onrender.com/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com","password":"your-password"}'
# {"success":true,"data":{"token":"eyJ...","user":{...}}}
```

### Gradle — put the base URL in `BuildConfig`

```kotlin
// app/build.gradle.kts
android {
    buildFeatures { buildConfig = true }
    buildTypes {
        debug {
            // Emulator → host machine running `npm run dev:api` (port 3000). Use your LAN IP for a physical device.
            buildConfigField("String", "API_BASE_URL", "\"http://10.0.2.2:3000/api/v1/\"")
        }
        release {
            buildConfigField("String", "API_BASE_URL", "\"https://thinktank-academia.onrender.com/api/v1/\"")
        }
    }
}
```

```kotlin
val retrofit = Retrofit.Builder()
    .baseUrl(BuildConfig.API_BASE_URL)        // must end with "/"
    .client(okHttpClient)
    .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
    .build()
```

The debug flavour talks plain HTTP to your dev machine, so allow cleartext for
that build only (`android:usesCleartextTraffic="true"` in a debug manifest or a
`network_security_config.xml` scoped to `10.0.2.2`). Production is HTTPS.

---

## 2. Recommended Android Technology Stack

- **HTTP Client:** Retrofit 2 + OkHttp 4
- **Serialization:** `kotlinx.serialization` or Moshi
- **Local Persistence / Offline Cache:** Room Database (for courses, articles, book summaries)
- **Token Security:** `EncryptedSharedPreferences` (Jetpack Security) backed by Android Keystore
- **Asynchronous Flow:** Kotlin Coroutines & `Flow`
- **Dependency Injection:** Hilt / Dagger

---

## 3. Retrofit API Interface Definition

```kotlin
package org.thinktankacademia.data.remote

import retrofit2.Response
import retrofit2.http.*

data class ApiResponse<T>(
    val success: Boolean,
    val data: T?,
    val error: ApiError?
)

data class ApiError(
    val code: String,
    val message: String,
    val details: Map<String, Any>?
)

interface ThinkTankApiService {

    // ── Authentication ──
    @POST("auth/login")
    suspend fun login(@Body body: LoginRequest): ApiResponse<AuthResponse>

    @POST("auth/register")
    suspend fun register(@Body body: RegisterRequest): ApiResponse<AuthResponse>

    @GET("auth/session")
    suspend fun getSession(): ApiResponse<SessionResponse>

    @POST("auth/forgot-password")
    suspend fun forgotPassword(@Body body: ForgotPasswordRequest): ApiResponse<MessageResponse>

    // ── User Profile ──
    @GET("users/me")
    suspend fun getProfile(): ApiResponse<UserDto>

    @PATCH("users/me")
    suspend fun updateProfile(@Body body: UpdateProfileRequest): ApiResponse<UserDto>

    @POST("users/me/devices")
    suspend fun registerDeviceToken(@Body body: DeviceTokenRequest): ApiResponse<DeviceRegisteredResponse>

    // ── Home & Sections ──
    @GET("home")
    suspend fun getHomePayload(@Query("refresh") refresh: Int? = null): ApiResponse<HomePayloadDto>

    @GET("sections")
    suspend fun getSections(): ApiResponse<List<SectionDto>>

    // ── Courses & LMS ──
    @GET("courses")
    suspend fun getCourses(
        @Query("q") query: String? = null,
        @Query("section") section: String? = null,
        @Query("difficulty") difficulty: String? = null,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 12
    ): ApiResponse<PagedResponse<CourseDto>>

    @GET("courses/{slug}")
    suspend fun getCourseDetail(@Path("slug") slug: String): ApiResponse<CourseDetailDto>

    @POST("courses/{id}/enroll")
    suspend fun enrollCourse(@Path("id") courseId: String): ApiResponse<EnrollmentResponse>

    @GET("lessons/{id}")
    suspend fun getLessonDetail(@Path("id") lessonId: String): ApiResponse<LessonDetailDto>

    @POST("lessons/{id}/complete")
    suspend fun completeLesson(
        @Path("id") lessonId: String,
        @Body body: LessonCompleteRequest = LessonCompleteRequest(secondsSpent = 0)
    ): ApiResponse<LessonCompleteResponse>

    // ── Assessment & Quizzes ──
    @GET("quizzes")
    suspend fun getQuizzes(
        @Query("kind") kind: String? = null,
        @Query("category") category: String? = null,
        @Query("q") query: String? = null,
        @Query("page") page: Int = 1
    ): ApiResponse<PagedResponse<QuizSummaryDto>>

    @GET("quizzes/{slug}")
    suspend fun getQuizDetail(@Path("slug") slug: String): ApiResponse<QuizDetailDto>

    @POST("quizzes/{slug}/start")
    suspend fun startQuiz(@Path("slug") slug: String): ApiResponse<QuizSessionDto>

    @POST("attempts/{id}/answers")
    suspend fun autosaveAnswers(
        @Path("id") attemptId: String,
        @Body body: AutosaveAnswersRequest
    ): ApiResponse<AutosaveResponse>

    @POST("attempts/{id}/submit")
    suspend fun submitAttempt(
        @Path("id") attemptId: String,
        @Body body: SubmitAttemptRequest
    ): ApiResponse<AttemptResultDto>

    @GET("attempts/{id}")
    suspend fun getAttemptResult(@Path("id") attemptId: String): ApiResponse<AttemptResultDto>

    // ── Content & Books ──
    @GET("content")
    suspend fun getContent(
        @Query("type") type: String? = null,
        @Query("stance") stance: String? = null,
        @Query("q") query: String? = null,
        @Query("page") page: Int = 1
    ): ApiResponse<PagedResponse<ContentItemDto>>

    @GET("content/{slug}")
    suspend fun getContentDetail(@Path("slug") slug: String): ApiResponse<ContentDetailDto>

    @GET("books")
    suspend fun getBooks(
        @Query("q") query: String? = null,
        @Query("sort") sort: String? = null,
        @Query("page") page: Int = 1
    ): ApiResponse<PagedResponse<BookSummaryDto>>

    @GET("books/{slug}")
    suspend fun getBookDetail(@Path("slug") slug: String): ApiResponse<BookDetailDto>

    // ── Search & Bookmarks ──
    @GET("search")
    suspend fun search(
        @Query("q") query: String,
        @Query("type") type: String? = null,
        @Query("page") page: Int = 1
    ): ApiResponse<SearchResultDto>

    @GET("bookmarks")
    suspend fun getBookmarks(@Query("type") type: String? = null): ApiResponse<List<BookmarkDto>>

    @POST("bookmarks")
    suspend fun addBookmark(@Body body: BookmarkRequest): ApiResponse<BookmarkResponse>

    @DELETE("bookmarks/{type}/{id}")
    suspend fun removeBookmark(@Path("type") type: String, @Path("id") id: String): ApiResponse<BookmarkResponse>

    @GET("notifications")
    suspend fun getNotifications(): ApiResponse<NotificationsDto>

    @PATCH("notifications/{id}/read")
    suspend fun markNotificationRead(@Path("id") id: String): ApiResponse<ReadResponse>
}
```

---

## 4. Auth Interceptor Implementation

```kotlin
package org.thinktankacademia.data.remote

import okhttp3.Interceptor
import okhttp3.Response

class AuthInterceptor(private val tokenProvider: () -> String?) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()
        val token = tokenProvider()

        val newRequest = if (!token.isNullOrBlank()) {
            originalRequest.newBuilder()
                .header("Authorization", "Bearer $token")
                .header("Accept", "application/json")
                .build()
        } else {
            originalRequest.newBuilder()
                .header("Accept", "application/json")
                .build()
        }

        val response = chain.proceed(newRequest)

        // Clear local credentials on 401 Unauthorized
        if (response.code == 401) {
            TokenManager.clearToken()
        }

        return response
    }
}
```

---

## 5. Cold Starts & Network Timeouts

Render web services on Starter plans may sleep after periods of inactivity.
Configure OkHttp client with appropriate timeouts to prevent false failures during a wake-up:

```kotlin
val okHttpClient = OkHttpClient.Builder()
    .addInterceptor(AuthInterceptor { TokenManager.getToken() })
    .connectTimeout(30, TimeUnit.SECONDS)
    .readTimeout(30, TimeUnit.SECONDS)
    .writeTimeout(30, TimeUnit.SECONDS)
    .retryOnConnectionFailure(true)
    .build()
```

---

## 6. Push Notifications (Firebase Cloud Messaging)

1. Obtain the FCM device registration token in Android:
```kotlin
FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
    if (task.isSuccessful) {
        val token = task.result
        apiService.registerDeviceToken(DeviceTokenRequest(token = token, platform = "android"))
    }
}
```
2. When the backend publishes announcements, course enrollments, or quiz results, FCM sends notifications directly to the registered device tokens.

---

## 7. Offline Caching Strategy

- Cache non-sensitive catalog data (Courses, Categories, Books, Articles) in Room for offline access.
- Queue offline lesson completions locally and sync with `POST /lessons/{id}/complete` once network connectivity is restored (the endpoint is idempotent).
- Do not cache raw quiz question answers locally before submission.
