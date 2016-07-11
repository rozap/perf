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
  
end