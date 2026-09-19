# Android integration

Use the same production API as web: `https://YOUR_SERVICE.onrender.com/api/v1`; never ship a separate database. See [complete endpoint contract](API.md).

Recommended Kotlin stack: Retrofit/OkHttp, Kotlin serialization or Moshi, Room for non-sensitive offline cache, DataStore for preferences, and Android Keystore-backed encrypted storage for the bearer token. Add `Authorization: Bearer <token>` in an OkHttp interceptor. On 401, clear the token and return to sign-in (this API intentionally does not issue refresh tokens yet). Do not log tokens, passwords, quiz correct answers, or profile data.

```kotlin
interface ThinkTankApi {
 @POST("auth/login") suspend fun login(@Body body: LoginRequest): Envelope<LoginData>
 @GET("users/me") suspend fun profile(): Envelope<User>
 @GET("courses") suspend fun courses(@Query("q") q: String? = null, @Query("page") page: Int = 1): Envelope<CoursePage>
 @GET("courses/{slug}") suspend fun course(@Path("slug") slug: String): Envelope<Course>
 @POST("courses/{id}/enroll") suspend fun enroll(@Path("id") id: String): Envelope<Enrolled>
 @POST("lessons/{id}/complete") suspend fun complete(@Path("id") id: String): Envelope<Completed>
 @GET("quizzes/{id}") suspend fun quiz(@Path("id") id: String): Envelope<Quiz>
 @POST("quizzes/{id}/submit") suspend fun submit(@Path("id") id: String, @Body request: QuizSubmission): Envelope<QuizResult>
 @GET("content") suspend fun content(@Query("type") type: String): Envelope<ContentPage>
 @GET("search") suspend fun search(@Query("q") query: String): Envelope<SearchResult>
 @GET("bookmarks") suspend fun bookmarks(): Envelope<List<Bookmark>>
 @GET("notifications") suspend fun notifications(): Envelope<List<Notification>>
}
```

Map HTTP errors using `error.code`, not translated message text. Cache only GET responses. Queue lesson completion when offline and replay idempotently. Enrollment/bookmark/completion endpoints are idempotent. Render cold starts can warrant a 30-second first-request timeout and retry only safe/idempotent calls with backoff. Image URLs may be absolute CDN URLs or same-origin paths.

Push readiness: notification records and read-state API exist, but FCM device-token registration/delivery is not implemented. Do not claim push support until token storage, consent, and a server-side FCM sender are added.
