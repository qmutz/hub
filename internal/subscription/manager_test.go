package subscription

import (
	"context"
	"errors"
	"testing"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/tests"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

const (
	userID    = "00000000-0000-0000-0000-000000000001"
	packageID = "00000000-0000-0000-0000-000000000001"
)

func TestAdd(t *testing.T) {
	dbQuery := "select add_subscription($1::jsonb)"
	ctx := context.WithValue(context.Background(), hub.UserIDKey, userID)

	t.Run("user id not found in ctx", func(t *testing.T) {
		m := NewManager(nil)
		assert.Panics(t, func() {
			_ = m.Add(context.Background(), &hub.Subscription{})
		})
	})

	t.Run("invalid input", func(t *testing.T) {
		testCases := []struct {
			errMsg string
			s      *hub.Subscription
		}{
			{
				"invalid package id",
				&hub.Subscription{
					PackageID: "invalid",
				},
			},
			{
				"invalid notification kind",
				&hub.Subscription{
					PackageID:        packageID,
					NotificationKind: hub.NotificationKind(5),
				},
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.errMsg, func(t *testing.T) {
				m := NewManager(nil)
				err := m.Add(ctx, tc.s)
				assert.True(t, errors.Is(err, ErrInvalidInput))
				assert.Contains(t, err.Error(), tc.errMsg)
			})
		}
	})

	s := &hub.Subscription{
		PackageID:        packageID,
		NotificationKind: hub.NewRelease,
	}

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", dbQuery, mock.Anything).Return(tests.ErrFakeDatabaseFailure)
		m := NewManager(db)

		err := m.Add(ctx, s)
		assert.Equal(t, tests.ErrFakeDatabaseFailure, err)
		db.AssertExpectations(t)
	})

	t.Run("database query succeeded", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", dbQuery, mock.Anything).Return(nil)
		m := NewManager(db)

		err := m.Add(ctx, s)
		assert.NoError(t, err)
		db.AssertExpectations(t)
	})
}

func TestDelete(t *testing.T) {
	dbQuery := "select delete_subscription($1::jsonb)"
	ctx := context.WithValue(context.Background(), hub.UserIDKey, userID)

	t.Run("user id not found in ctx", func(t *testing.T) {
		m := NewManager(nil)
		assert.Panics(t, func() {
			_ = m.Delete(context.Background(), &hub.Subscription{})
		})
	})

	t.Run("invalid input", func(t *testing.T) {
		testCases := []struct {
			errMsg string
			s      *hub.Subscription
		}{
			{
				"invalid package id",
				&hub.Subscription{
					PackageID: "invalid",
				},
			},
			{
				"invalid notification kind",
				&hub.Subscription{
					PackageID:        packageID,
					NotificationKind: hub.NotificationKind(5),
				},
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.errMsg, func(t *testing.T) {
				m := NewManager(nil)
				err := m.Delete(ctx, tc.s)
				assert.True(t, errors.Is(err, ErrInvalidInput))
				assert.Contains(t, err.Error(), tc.errMsg)
			})
		}
	})

	s := &hub.Subscription{
		PackageID:        packageID,
		NotificationKind: hub.NewRelease,
	}

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", dbQuery, mock.Anything).Return(tests.ErrFakeDatabaseFailure)
		m := NewManager(db)

		err := m.Delete(ctx, s)
		assert.Equal(t, tests.ErrFakeDatabaseFailure, err)
		db.AssertExpectations(t)
	})

	t.Run("database query succeeded", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", dbQuery, mock.Anything).Return(nil)
		m := NewManager(db)

		err := m.Delete(ctx, s)
		assert.NoError(t, err)
		db.AssertExpectations(t)
	})
}

func TestGetByPackageJSON(t *testing.T) {
	dbQuery := "select get_package_subscriptions($1::uuid, $2::uuid)"
	ctx := context.WithValue(context.Background(), hub.UserIDKey, userID)

	t.Run("user id not found in ctx", func(t *testing.T) {
		m := NewManager(nil)
		assert.Panics(t, func() {
			_, _ = m.GetByPackageJSON(context.Background(), "")
		})
	})

	t.Run("invalid input", func(t *testing.T) {
		m := NewManager(nil)
		_, err := m.GetByPackageJSON(ctx, "")
		assert.True(t, errors.Is(err, ErrInvalidInput))
		assert.Contains(t, err.Error(), "invalid package id")
	})

	t.Run("database query succeeded", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", dbQuery, userID, packageID).Return([]byte("dataJSON"), nil)
		m := NewManager(db)

		dataJSON, err := m.GetByPackageJSON(ctx, packageID)
		assert.NoError(t, err)
		assert.Equal(t, []byte("dataJSON"), dataJSON)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", dbQuery, userID, packageID).Return(nil, tests.ErrFakeDatabaseFailure)
		m := NewManager(db)

		dataJSON, err := m.GetByPackageJSON(ctx, packageID)
		assert.Equal(t, tests.ErrFakeDatabaseFailure, err)
		assert.Nil(t, dataJSON)
		db.AssertExpectations(t)
	})
}

func TestGetByUserJSON(t *testing.T) {
	dbQuery := "select get_user_subscriptions($1::uuid)"
	ctx := context.WithValue(context.Background(), hub.UserIDKey, userID)

	t.Run("user id not found in ctx", func(t *testing.T) {
		m := NewManager(nil)
		assert.Panics(t, func() {
			_, _ = m.GetByUserJSON(context.Background())
		})
	})

	t.Run("database query succeeded", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", dbQuery, userID).Return([]byte("dataJSON"), nil)
		m := NewManager(db)

		dataJSON, err := m.GetByUserJSON(ctx)
		assert.NoError(t, err)
		assert.Equal(t, []byte("dataJSON"), dataJSON)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", dbQuery, userID).Return(nil, tests.ErrFakeDatabaseFailure)
		m := NewManager(db)

		dataJSON, err := m.GetByUserJSON(ctx)
		assert.Equal(t, tests.ErrFakeDatabaseFailure, err)
		assert.Nil(t, dataJSON)
		db.AssertExpectations(t)
	})
}

func TestGetSubscriptors(t *testing.T) {
	dbQuery := "select get_subscriptors($1::uuid, $2::integer)"

	t.Run("invalid input", func(t *testing.T) {
		testCases := []struct {
			errMsg           string
			packageID        string
			notificationKind hub.NotificationKind
		}{
			{
				"invalid package id",
				"invalid",
				0,
			},
			{
				"invalid notification kind",
				packageID,
				hub.NotificationKind(5),
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.errMsg, func(t *testing.T) {
				m := NewManager(nil)
				dataJSON, err := m.GetSubscriptors(context.Background(), tc.packageID, tc.notificationKind)
				assert.True(t, errors.Is(err, ErrInvalidInput))
				assert.Contains(t, err.Error(), tc.errMsg)
				assert.Nil(t, dataJSON)
			})
		}
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", dbQuery, packageID, hub.NotificationKind(0)).Return(nil, tests.ErrFakeDatabaseFailure)
		m := NewManager(db)

		subscriptors, err := m.GetSubscriptors(context.Background(), packageID, hub.NewRelease)
		assert.Equal(t, tests.ErrFakeDatabaseFailure, err)
		assert.Nil(t, subscriptors)
		db.AssertExpectations(t)
	})

	t.Run("database query succeeded", func(t *testing.T) {
		expectedSubscriptors := []*hub.User{
			{
				Email: "user1@email.com",
			},
			{
				Email: "user2@email.com",
			},
		}

		db := &tests.DBMock{}
		db.On("QueryRow", dbQuery, packageID, hub.NotificationKind(0)).Return([]byte(`
		[
			{
				"email": "user1@email.com"
			},
			{
				"email": "user2@email.com"
			}
		]
		`), nil)
		m := NewManager(db)

		subscriptors, err := m.GetSubscriptors(context.Background(), packageID, hub.NewRelease)
		assert.NoError(t, err)
		assert.Equal(t, expectedSubscriptors, subscriptors)
		db.AssertExpectations(t)
	})
}
