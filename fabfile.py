from time import sleep
from fabric.api import *
from fabric.contrib.console import confirm
from fabric.colors import *
from os import listdir
from os.path import isdir, join
from distutils.version import StrictVersion
from sh import gcloud
import json


def list_instances(kind):
    out = str(gcloud(['compute', 'instances', 'list', '--format', 'json']))
    return [i for i in json.loads(out) if kind in i['name']]

def public_ip(instance):
    return instance['networkInterfaces'][0]['accessConfigs'][0]['natIP']

def disk_of(instance):
    return instance['disks'][0]['source']

def hosts(kind):
    instances = list_instances(kind)
    return [public_ip(h) for h in instances]


# env.use_ssh_config = True

#REMOTE
base_dir = "/var/sites/perf"
log_dir = "/var/log/perf"
media_dir = "/var/sites/perf_media"

#LOCAL
releases = "./rel/perf/releases"
archive_name = "perf.tar.gz"

def check_deploy():
    pass
    # local('mix clean')
    # local('mix test')

def prepare_deploy():
    local('mix ship')
    with open('package.json') as f:
        version = json.loads(f.read())['version']
        print("prepared deploy %s" % version)
        return version


def make_dirs(version):
    sudo("mkdir -p {base_dir}".format(base_dir = base_dir))
    sudo("mkdir -p {log_dir}".format(log_dir = log_dir))
    sudo("mkdir -p {media_dir}".format(media_dir = media_dir))
    sudo("mkdir -p {base_dir}/releases/{version}".format(
        base_dir = base_dir,
        version = version
    ))

    sudo("chown -R perf:perf {base_dir}".format(base_dir = base_dir))
    sudo("chown -R perf:perf {log_dir}".format(log_dir = log_dir))
    sudo("chown -R perf:perf {media_dir}".format(media_dir = media_dir))

def ensure_packages(dep_file):
    # with hide('output'):
    with open('./deploy/%s' % dep_file) as f:
        packages = ' '.join(f.read().split('\n'))
        sudo("apt-get update")
        sudo("apt-get install -y %s" % packages)

def build_release():
    print(green("Building release"))
    with shell_env(MIX_ENV='prod'):
        local('mix compile')
        local("gulp deploy")
        local("mix phoenix.digest")
        local("mix release")

        rels = [ StrictVersion(f) for f in listdir(releases) if isdir(join(releases,f)) ]
        release_dir = join(releases, str(max(rels)))
        return archive_name, join(release_dir, archive_name)

def ship(version):
    archive_name, archive = build_release()

    make_dirs(version)
    put(archive, "{base_dir}/releases/{version}".format(
        base_dir = base_dir,
        version = version
    ), use_sudo = True)

    with cd(base_dir):
        sudo("tar xfz {base_dir}/releases/{version}/{archive_name}".format(
            archive_name = archive_name,
            base_dir = base_dir,
            version = version
        ))
    put("deploy/upstart.conf", "/etc/init/perf.conf", use_sudo = True)

def migrate(version):
    artifact = 'perf-%s' % version
    print(cyan("""
        To migrate, run

            sudo {base_dir}/bin/perf

        And then in the console:

            Ecto.Migrator.run(Usic.Repo, "/var/sites/perf/lib/{artifact}/priv/repo/migrations", :up, all: true)
    """.format(
        base_dir = base_dir,
        artifact = artifact
    )))
    return prompt('Are your migrations in order?', default = 'no')

def upgrade(version):
    print(yellow("Upgrading to {version}".format(version = version)))
    with cd(base_dir):
        sudo("bin/perf upgrade {version}".format(version = version))

@task
def rollback(version):
    print(yellow("Downgrade to {version}".format(version = version)))
    with cd(base_dir):
        sudo("bin/perf downgrade {version}".format(version = version))

@task
def list():
    print(green("getting..."))
    print gcloud(['compute', 'instances', 'list'])



def make_phx(index):
    name = 'phx%s' % index
    [out] = json.loads(str(gcloud(['compute', 'instances', 'create', name, '--disk', 'name=phx-disk-0,boot=yes', '--format', 'json'])))
    print(green("created {name} with public ip {ip} disk {disk}".format(
        ip = public_ip(out),
        name = name,
        disk = disk_of(out)
    )))
    print("Setting hosts to be %s" % public_ip(out))
    env.hosts = [public_ip(out)]
    env.host_string = public_ip(out)
    print("Going to sleep for a bit...")
    sleep(15)
    print("Starting deploy to %s" % public_ip(out))
    do_deploy()



def build_pg(ip):
    env.hosts = [ip]
    env.host_string = ip

    # sudo('id -u {username} &>/dev/null || adduser {username}'.format(
    #     username='postgres'
    # ))
    # sudo('echo "{username}:{password}" | chpasswd'.format(
    #     username='postgres',
    #     password='postgres'))

    # sudo('mkdir -p /data/postgres/9.4/main/')
    # sudo('chown -R postgres:postgres /data/postgres')

    sudo('add-apt-repository "deb https://apt.postgresql.org/pub/repos/apt/ trusty-pgdg main"')
    sudo('wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -')
    ensure_packages('pg-deps.txt')

    # sudo('service postgresql stop')
    # hba = '/etc/postgresql/9.4/main/pg_hba.conf'
    # conf = '/etc/postgresql/9.4/main/postgresql.conf'
    # put('deploy/pg_hba.conf', hba, use_sudo = True)
    # put('deploy/postgresql.conf', conf, use_sudo = True)
    # sudo('chown postgres:postgres %s' % hba)
    # sudo('chown postgres:postgres %s' % conf)
    # sudo('service postgresql restart')

@task
def setup_pg(ip):
    build_pg(ip)

def make_pg():
    name = 'pg'
    [out] = json.loads(str(gcloud(['compute', 'instances', 'create', name, '--disk', 'name=pg-disk,boot=yes', '--format', 'json'])))
    print(green("created {name} with public ip {ip} disk {disk}".format(
        ip = public_ip(out),
        name = name,
        disk = disk_of(out)
    )))
    print("Setting hosts to be %s" % public_ip(out))
    sleep(15)
    build_pg(public_ip(out))

@task
def up(kind):
    print(green("making a new %s" % kind))
    kinds = list_instances(kind)
    index = len(kinds)
    if kind == 'phx':
        return make_phx(index)

    if kind == 'pg' and index == 0:
        return make_pg()

    print(red("idk how to make a %s" % kind))

@task
def down(kind):
    print(yellow("deleting a %s" % kind))
    kinds = list_instances(kind)
    index = len(kinds) - 1
    if index < 0:
        print("Nothing to delete")
        return
    if kind == 'phx':
        name = 'phx%s' % index
        print(yellow("deleting %s" % name))
        return gcloud(['compute', 'instances', 'delete', name, '-q'])

    if kind == 'pg':
        print(yellow("deleting %s" % kind))
        return gcloud(['compute', 'instances', 'delete', kind, '-q'])

    print(red("idk how to delete a %s" % kind))


def do_deploy():
    ensure_packages('phx-deps.txt')
    version = prepare_deploy()
    ship(version)


@task
def deploy(version):
    hs = hosts('phx')
    env.hosts = hs
    env.host_string = ' '.join(hs)

    check_deploy()
    mix_vesion = prepare_deploy()
    assert version == mix_vesion
    print(green("starting deploy"))
    do_deploy()
    res = migrate(version)

    print "You said", res
    if res == 'yes':
        upgrade(version)
    else:
        print(red("Not upgrading until migrations are done"))
