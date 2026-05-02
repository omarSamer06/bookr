import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';

// Registers OAuth strategies once at boot so routes stay thin and testable
export default function configurePassport() {
  const clientID = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const callbackURL =
    process.env.GOOGLE_CALLBACK_URL ||
    `http://localhost:${process.env.PORT || 5000}/api/v1/auth/google/callback`;

  if (!clientID || !clientSecret) {
    console.warn(
      'Google OAuth disabled: GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET missing'
    );
    return;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID,
        clientSecret,
        callbackURL,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value?.toLowerCase()?.trim();
          if (!email) {
            done(new Error('Google profile missing email'), null);
            return;
          }

          let user = await User.findOne({ googleId: profile.id });
          if (user) {
            done(null, user);
            return;
          }

          user = await User.findOne({ email });
          if (user) {
            user.googleId = profile.id;
            if (!user.avatar && profile.photos?.[0]?.value) {
              user.avatar = profile.photos[0].value;
            }
            await user.save();
            done(null, user);
            return;
          }

          user = await User.create({
            googleId: profile.id,
            email,
            name: profile.displayName || email.split('@')[0],
            avatar: profile.photos?.[0]?.value || '',
          });
          done(null, user);
        } catch (err) {
          done(err, null);
        }
      }
    )
  );
}
