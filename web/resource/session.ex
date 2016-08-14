defmodule Perf.Resource.Session do
  defimpl Perf.Resource.Create, for: Perf.Session do
    use Perf.Resource
    alias Perf.{Repo, User, Session}
    import Ecto.Query


    def gen_session(state, %User{password: hashed_pass} = user, password) do
      if Comeonin.Pbkdf2.checkpw(password, hashed_pass) do
        {:ok, token, _claims} = Guardian.encode_and_sign(user, :token)
        created(state, %Session{token: token, user: user})
      else
        bad_request(state, %{"password" => ["is incorrect"]})
      end
    end

    def handle(model, state) do
      case Perf.Session.validate(state.params) do
        {:ok, %{"email" => email, "password" => password}} ->

          query = from u in User, where: u.email == ^email
          case Repo.one(query) do
            nil -> bad_request(state, %{"email" => ["does not exist"]})
            user -> gen_session(state, user, password)
          end
        {:error, error} ->
          bad_request(state, error)
      end
    end
  end

  defimpl Perf.Resource.Delete, for: Perf.Session do
    use Perf.Resource
    alias Perf.{Repo, User, Session}
    import Ecto.Query
    import Guardian.Phoenix.Socket
    alias Perf.Resource.State

    on(%{"token" => token}) do
      case Guardian.revoke!(token) do
        result -> ok(state, %{})
      end
    end
  end

  defimpl Perf.Resource.Read, for: Perf.Session do
    use Perf.Resource
    import Guardian.Phoenix.Socket

    on(%{"token" => token}) do
      case Guardian.decode_and_verify(token) do
        { :ok, claims } ->
          ok(state, claims)
        { :error, :token_not_found } ->
          not_found(state, %{reason: "expired"})
        { :error, reason } ->
          bad_request(state, %{reason: reason})
      end
    end

  end
end